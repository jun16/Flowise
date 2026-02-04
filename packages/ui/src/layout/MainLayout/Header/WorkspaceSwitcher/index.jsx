import { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

// material-ui
import { Check, Settings } from '@mui/icons-material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import {
    Dialog,
    DialogContent,
    CircularProgress,
    Button,
    Select,
    Typography,
    Stack,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    DialogActions,
    Fade
} from '@mui/material'
import { alpha, styled, useTheme } from '@mui/material/styles'

// api
import userApi from '@/api/user'
import workspaceApi from '@/api/workspace'
import accountApi from '@/api/account.api'

// hooks
import useApi from '@/hooks/useApi'
import { useConfig } from '@/store/context/ConfigContext'

// store
import { store } from '@/store'
import { logoutSuccess, workspaceSwitchSuccess } from '@/store/reducers/authSlice'
import { enqueueSnackbar } from '@/store/actions'

// ==============================|| WORKSPACE SWITCHER ||============================== //

const StyledMenu = styled((props) => (
    <Menu
        elevation={0}
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right'
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'right'
        }}
        transitionDuration={{
            enter: 300,
            exit: 200
        }}
        TransitionComponent={Fade}
        {...props}
    />
))(({ theme }) => ({
    '& .MuiPaper-root': {
        borderRadius: 6,
        marginTop: theme.spacing(1),
        minWidth: 160,
        [theme.breakpoints.up('sm')]: {
            minWidth: 180
        },
        [theme.breakpoints.up('md')]: {
            minWidth: 200
        },
        maxWidth: '80vw',
        [theme.breakpoints.up('sm')]: {
            maxWidth: 'auto'
        },
        boxShadow:
            'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
        '& .MuiMenu-list': {
            padding: '4px 0',
            maxHeight: '300px'
        },
        '& .MuiMenuItem-root': {
            padding: '6px 16px',
            [theme.breakpoints.up('sm')]: {
                padding: '8px 16px'
            },
            '& .MuiSvgIcon-root': {
                fontSize: 16,
                [theme.breakpoints.up('sm')]: {
                    fontSize: 18
                },
                color: theme.palette.text.secondary,
                marginRight: theme.spacing(1.5)
            },
            '& .MuiListItemText-root': {
                '& .MuiTypography-root': {
                    fontSize: '0.75rem',
                    [theme.breakpoints.up('sm')]: {
                        fontSize: '0.875rem'
                    }
                }
            },
            '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                transition: 'background-color 0.2s ease'
            },
            '&:active': {
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity)
            }
        }
    }
}))

const WorkspaceSwitcher = () => {
    const navigate = useNavigate()
    const theme = useTheme()
    const dispatch = useDispatch()

    const user = useSelector((state) => state.auth.user)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
    const features = useSelector((state) => state.auth.features)

    const { isEnterpriseLicensed } = useConfig()

    const [anchorEl, setAnchorEl] = useState(null)
    const open = Boolean(anchorEl)
    const prevOpen = useRef(open)

    const [assignedWorkspaces, setAssignedWorkspaces] = useState([])
    const [activeWorkspace, setActiveWorkspace] = useState(undefined)
    const [isSwitching, setIsSwitching] = useState(false)
    const [showWorkspaceUnavailableDialog, setShowWorkspaceUnavailableDialog] = useState(false)
    const [showErrorDialog, setShowErrorDialog] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const getWorkspacesByOrganizationIdUserIdApi = useApi(userApi.getWorkspacesByOrganizationIdUserId)
    const getWorkspacesByUserIdApi = useApi(userApi.getWorkspacesByUserId)
    const switchWorkspaceApi = useApi(workspaceApi.switchWorkspace)
    const logoutApi = useApi(accountApi.logout)

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const switchWorkspace = async (id) => {
        setAnchorEl(null)
        if (activeWorkspace !== id) {
            // 只有当有多个工作空间时才执行切换操作
            if (assignedWorkspaces.length > 1) {
                setIsSwitching(true)
                // 存储选择的工作空间到localStorage
                localStorage.setItem('activeWorkspaceId', id)
                switchWorkspaceApi.request(id)
            }
        }
    }

    const handleLogout = () => {
        logoutApi.request()
    }

    useEffect(() => {
        // Fetch workspaces when component mounts
        if (isAuthenticated && user) {
            // 移除对feat:workspaces标志的依赖，确保所有用户都能看到工作空间切换功能
            try {
                if (isEnterpriseLicensed && user.activeOrganizationId) {
                    getWorkspacesByOrganizationIdUserIdApi.request(user.activeOrganizationId, user.id)
                } else {
                    getWorkspacesByUserIdApi.request(user.id)
                }
            } catch (error) {
                console.error('Error fetching workspaces:', error)
                // 即使API调用失败，也要确保切换器显示，以便用户能访问管理页面
                setAssignedWorkspaces([])
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user, isEnterpriseLicensed])

    useEffect(() => {
        // Check for stored workspace in localStorage when component mounts
        if (isAuthenticated && user && assignedWorkspaces.length > 0) {
            const storedWorkspaceId = localStorage.getItem('activeWorkspaceId')
            if (storedWorkspaceId && storedWorkspaceId !== user.activeWorkspaceId) {
                // Switch to stored workspace if it's different from current
                const workspaceExists = assignedWorkspaces.find((w) => w.id === storedWorkspaceId)
                if (workspaceExists && assignedWorkspaces.length > 1) {
                    setIsSwitching(true)
                    switchWorkspaceApi.request(storedWorkspaceId)
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user, assignedWorkspaces.length])

    useEffect(() => {
        if (getWorkspacesByOrganizationIdUserIdApi.data) {
            const formattedAssignedWorkspaces = getWorkspacesByOrganizationIdUserIdApi.data.map((item) => ({
                id: item.workspaceId,
                name: item.workspace.name
            }))

            const sortedWorkspaces = [...formattedAssignedWorkspaces].sort((a, b) => a.name.localeCompare(b.name))

            // Only check workspace availability after a short delay to allow store updates to complete
            setTimeout(() => {
                if (user && user.activeWorkspaceId && !sortedWorkspaces.find((item) => item.id === user.activeWorkspaceId)) {
                    setShowWorkspaceUnavailableDialog(true)
                }
            }, 500)

            setAssignedWorkspaces(sortWorkspaces(sortedWorkspaces))
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getWorkspacesByOrganizationIdUserIdApi.data, user.activeWorkspaceId])

    useEffect(() => {
        if (getWorkspacesByUserIdApi.data) {
            const formattedAssignedWorkspaces = getWorkspacesByUserIdApi.data.map((item) => ({
                id: item.workspaceId,
                name: item.workspace.name
            }))

            const sortedWorkspaces = [...formattedAssignedWorkspaces].sort((a, b) => a.name.localeCompare(b.name))

            // Only check workspace availability after a short delay to allow store updates to complete
            setTimeout(() => {
                if (user && user.activeWorkspaceId && !sortedWorkspaces.find((item) => item.id === user.activeWorkspaceId)) {
                    setShowWorkspaceUnavailableDialog(true)
                }
            }, 500)

            setAssignedWorkspaces(sortWorkspaces(sortedWorkspaces))
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getWorkspacesByUserIdApi.data, user.activeWorkspaceId])

    useEffect(() => {
        if (switchWorkspaceApi.data) {
            setIsSwitching(false)
            store.dispatch(workspaceSwitchSuccess(switchWorkspaceApi.data))

            // 显示成功提示
            dispatch(
                enqueueSnackbar({
                    message: 'Workspace switched successfully',
                    options: {
                        variant: 'success',
                        autoHideDuration: 3000
                    }
                })
            )

            // get the current path and navigate to the same after refresh
            navigate('/', { replace: true })
            navigate(0)
        }
    }, [switchWorkspaceApi.data, navigate, dispatch])

    useEffect(() => {
        if (switchWorkspaceApi.error) {
            setIsSwitching(false)
            setShowWorkspaceUnavailableDialog(false)

            // 显示错误提示
            const errorMessage = switchWorkspaceApi.error.message || 'Failed to switch workspace'
            dispatch(
                enqueueSnackbar({
                    message: errorMessage,
                    options: {
                        variant: 'error',
                        autoHideDuration: 5000
                    }
                })
            )

            // 清除localStorage中的错误工作空间ID
            localStorage.removeItem('activeWorkspaceId')
        }
    }, [switchWorkspaceApi.error, dispatch])

    useEffect(() => {
        try {
            if (logoutApi.data && logoutApi.data.message === 'logged_out') {
                store.dispatch(logoutSuccess())
                window.location.href = logoutApi.data.redirectTo
            }
        } catch (e) {
            console.error(e)
        }
    }, [logoutApi.data])

    useEffect(() => {
        setActiveWorkspace(user.activeWorkspace)

        prevOpen.current = open
    }, [open, user])

    const sortWorkspaces = (assignedWorkspaces) => {
        // Sort workspaces alphabetically by name, with special characters last
        const sortedWorkspaces = assignedWorkspaces
            ? [...assignedWorkspaces].sort((a, b) => {
                  const isSpecialA = /^[^a-zA-Z0-9]/.test(a.name)
                  const isSpecialB = /^[^a-zA-Z0-9]/.test(b.name)

                  // If one has special char and other doesn't, special char goes last
                  if (isSpecialA && !isSpecialB) return 1
                  if (!isSpecialA && isSpecialB) return -1

                  // If both are special or both are not special, sort alphabetically
                  return a.name.localeCompare(b.name, undefined, {
                      numeric: true,
                      sensitivity: 'base'
                  })
              })
            : []
        return sortedWorkspaces
    }

    return (
        <>
            {isAuthenticated && user ? (
                <>
                    <Button
                        sx={{
                            mr: { xs: 2, sm: 3, md: 4 },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            padding: { xs: '6px 12px', sm: '8px 16px' },
                            minWidth: { xs: '100px', sm: '120px' },
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                transform: 'translateY(-1px)'
                            },
                            '&:active': {
                                transform: 'translateY(0)'
                            }
                        }}
                        id='workspace-switcher'
                        aria-controls={open ? 'workspace-switcher-menu' : undefined}
                        aria-haspopup='true'
                        aria-expanded={open ? 'true' : undefined}
                        disableElevation
                        onClick={handleClick}
                        endIcon={
                            <KeyboardArrowDownIcon
                                sx={{
                                    transition: 'transform 0.2s ease',
                                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                                    fontSize: { xs: '1rem', sm: '1.125rem' }
                                }}
                            />
                        }
                    >
                        <Typography
                            noWrap
                            sx={{
                                maxWidth: { xs: '120px', sm: '160px', md: '200px' }
                            }}
                        >
                            {user.activeWorkspace || 'Workspaces'}
                        </Typography>
                    </Button>
                    <StyledMenu
                        id='workspace-switcher-menu'
                        MenuListProps={{
                            'aria-labelledby': 'workspace-switcher'
                        }}
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleClose}
                    >
                        {assignedWorkspaces.length > 0 ? (
                            assignedWorkspaces.map((item, index) => (
                                <MenuItem
                                    onClick={() => {
                                        switchWorkspace(item.id)
                                    }}
                                    key={index}
                                    disableRipple
                                >
                                    {item.id === user.activeWorkspaceId ? (
                                        <>
                                            <ListItemIcon>
                                                <Check />
                                            </ListItemIcon>
                                            <ListItemText>{item.name}</ListItemText>
                                        </>
                                    ) : (
                                        <ListItemText inset>{item.name}</ListItemText>
                                    )}
                                </MenuItem>
                            ))
                        ) : (
                            <MenuItem disabled disableRipple>
                                <ListItemText inset>No workspaces yet</ListItemText>
                            </MenuItem>
                        )}
                        <MenuItem
                            onClick={() => {
                                setAnchorEl(null)
                                navigate('/workspaces')
                            }}
                            disableRipple
                        >
                            <ListItemIcon>
                                <Settings />
                            </ListItemIcon>
                            <ListItemText>Manage Workspaces</ListItemText>
                        </MenuItem>
                    </StyledMenu>
                </>
            ) : null}
            <Dialog open={isSwitching} PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none' } }}>
                <DialogContent>
                    <Stack spacing={2} alignItems='center'>
                        <CircularProgress />
                        <Typography variant='body1' style={{ color: 'white' }}>
                            Switching workspace...
                        </Typography>
                    </Stack>
                </DialogContent>
            </Dialog>

            <Dialog
                open={showWorkspaceUnavailableDialog}
                disableEscapeKeyDown
                disableBackdropClick
                PaperProps={{
                    style: {
                        padding: '20px',
                        minWidth: '400px'
                    }
                }}
            >
                <DialogContent>
                    <Stack spacing={3}>
                        <Typography variant='h5'>Workspace Unavailable</Typography>
                        <Typography variant='body1'>
                            Your current workspace is no longer available. Please select another workspace to continue.
                        </Typography>
                        <Select
                            fullWidth
                            value=''
                            onChange={(event) => {
                                setShowWorkspaceUnavailableDialog(false)
                                switchWorkspace(event.target.value)
                            }}
                            displayEmpty
                        >
                            <MenuItem disabled value=''>
                                <em>Select Workspace</em>
                            </MenuItem>
                            {assignedWorkspaces.map((workspace, index) => (
                                <MenuItem key={index} value={workspace.id}>
                                    {workspace.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </Stack>
                </DialogContent>
                {assignedWorkspaces.length === 0 && (
                    <DialogActions>
                        <Button onClick={handleLogout} variant='contained' color='primary'>
                            Logout
                        </Button>
                    </DialogActions>
                )}
            </Dialog>

            {/* Error Dialog */}
            <Dialog
                open={showErrorDialog}
                disableEscapeKeyDown
                disableBackdropClick
                PaperProps={{
                    style: {
                        padding: '20px',
                        minWidth: '400px'
                    }
                }}
            >
                <DialogContent>
                    <Stack spacing={3}>
                        <Typography variant='h5'>Workspace Switch Error</Typography>
                        <Typography variant='body1'>{errorMessage}</Typography>
                        {isEnterpriseLicensed && (
                            <Typography variant='body2' color='text.secondary'>
                                Please contact your administrator for assistance.
                            </Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleLogout} variant='contained' color='primary'>
                        Logout
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

WorkspaceSwitcher.propTypes = {}

export default WorkspaceSwitcher
