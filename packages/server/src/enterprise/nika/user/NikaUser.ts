// NikaUser.ts
import { UserService } from '../../services/user.service'
import { WorkspaceUserService } from '../../services/workspace-user.service'
import { WorkspaceUser } from '../../database/entities/workspace-user.entity'
import { OrganizationService } from '../../services/organization.service'
import { GeneralRole } from '../../database/entities/role.entity'
import { RoleErrorMessage, RoleService } from '../../services/role.service'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { User, UserStatus } from '../../database/entities/user.entity'
import { WorkspaceService } from '../../services/workspace.service'
import { QueryRunner } from 'typeorm'
import { Workspace } from '../../database/entities/workspace.entity'

/**
 * 自定义Nika用户服务，避开企业版本
 * Nika User Service
 * 处理Nika系统的用户相关操作
 */
export class NikaUser {
    /**
     * 创建新的SSO用户
     * @param email 用户邮箱
     * @param displayName 用户名
     * @param queryRunner 数据库查询运行器
     * @returns 包含用户、工作区用户和工作区的对象
     */
    public async createNewSSOUser(
        email: string,
        displayName: string,
        queryRunner: QueryRunner
    ): Promise<{ user: User; workspaceUser: WorkspaceUser; workspace: Workspace }> {
        const userService = new UserService()
        const organizationService = new OrganizationService()
        const workspaceUserService = new WorkspaceUserService()
        const workspaceService = new WorkspaceService()
        const roleService = new RoleService()

        const userData: Partial<User> = {
            email: email,
            name: displayName || email,
            status: UserStatus.ACTIVE,
            credential: undefined
        }

        const newUser = await userService.createNewUser(userData, queryRunner)
        await userService.saveUser(newUser, queryRunner)
        console.log(`[NIKA_USER] 用户${email}创建成功，ID：${newUser.id}`)

        const organizations = await organizationService.readOrganization(queryRunner)
        if (organizations.length === 0) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'No organization found')
        }
        const organization = organizations[0]
        console.log(`[NIKA_USER] 使用组织：${organization.name}，ID：${organization.id}`)

        const workspaces = await workspaceService.readWorkspaceByOrganizationId(organization.id, queryRunner)
        if (workspaces.length === 0) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'No workspace found')
        }
        const workspace = workspaces[0]
        console.log(`[NIKA_USER] 使用工作区：${workspace.name}，ID：${workspace.id}`)

        const ownerRole = await roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
        if (!ownerRole) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
        }
        console.log(`[NIKA_USER] 使用角色：${ownerRole.name}，ID：${ownerRole.id}`)

        const workspaceUserData: Partial<WorkspaceUser> = {
            workspaceId: workspace.id,
            userId: newUser.id,
            roleId: ownerRole.id,
            createdBy: newUser.id,
            updatedBy: newUser.id
        }

        const newWorkspaceUser = workspaceUserService.createNewWorkspaceUser(workspaceUserData, queryRunner)
        await workspaceUserService.saveWorkspaceUser(newWorkspaceUser, queryRunner)
        console.log(`[NIKA_USER] 工作区用户创建成功，用户ID：${newUser.id}，工作区ID：${workspace.id}`)

        return {
            user: newUser,
            workspaceUser: newWorkspaceUser,
            workspace: workspace
        }
    }
}

export default NikaUser
