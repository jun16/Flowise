// PigxSSO.ts
import SSOBase from './SSOBase'
import passport from 'passport'
import { Strategy as OpenIDConnectStrategy, Profile, VerifyCallback } from 'passport-openidconnect'
import auditService from '../services/audit'
import { ErrorMessage, LoginActivityCode } from '../Interface.Enterprise'
import { setTokenOrCookies } from '../middleware/passport'
import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables directly in this file
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env'), override: true })
console.log('PigxSSO: Environment variables loaded')
console.log('PigxSSO: PIGX_SSO_CLIENT_ID:', process.env.PIGX_SSO_CLIENT_ID)
console.log('PigxSSO: PIGX_SSO_CLIENT_SECRET:', process.env.PIGX_SSO_CLIENT_SECRET)

class PigxSSO extends SSOBase {
    static LOGIN_URI = '/api/v1/pigx/login'
    static CALLBACK_URI = '/api/v1/pigx/callback'
    static LOGOUT_URI = '/api/v1/pigx/logout'

    getProviderName(): string {
        return 'Pigx SSO'
    }

    static getCallbackURL(): string {
        const port = process.env.PORT || '3000'
        const APP_URL = process.env.APP_URL || 'http://127.0.0.1:' + port
        return APP_URL + PigxSSO.CALLBACK_URI
    }

    setSSOConfig(ssoConfig: any) {
        super.setSSOConfig(ssoConfig)
        // Always set up the passport strategy, even if ssoConfig is empty
        console.log('PigxSSO setSSOConfig called with:', ssoConfig)
        console.log('Current this.ssoConfig:', this.ssoConfig)
        console.log('Environment variables:')
        console.log('PIGX_SSO_CLIENT_ID:', process.env.PIGX_SSO_CLIENT_ID)
        console.log('PIGX_SSO_CLIENT_SECRET:', process.env.PIGX_SSO_CLIENT_SECRET)
        console.log('PIGX_SSO_ISSUER:', process.env.PIGX_SSO_ISSUER)
        console.log('PIGX_SSO_AUTHORIZATION_URL:', process.env.PIGX_SSO_AUTHORIZATION_URL)
        console.log('PIGX_SSO_TOKEN_URL:', process.env.PIGX_SSO_TOKEN_URL)
        console.log('PIGX_SSO_USER_INFO_URL:', process.env.PIGX_SSO_USER_INFO_URL)
        console.log('PIGX_SSO_SCOPE:', process.env.PIGX_SSO_SCOPE)
        // 直接从环境变量获取clientID和clientSecret，确保它们被正确设置
        const clientID = process.env.PIGX_SSO_CLIENT_ID || 'nikaflowise'
        const clientSecret = process.env.PIGX_SSO_CLIENT_SECRET || 'nikaflowise'
        const issuer = process.env.PIGX_SSO_ISSUER || 'http://localhost:3002'
        const authorizationURL = process.env.PIGX_SSO_AUTHORIZATION_URL || 'http://localhost:3002/oauth2/authorize'
        const tokenURL = process.env.PIGX_SSO_TOKEN_URL || 'http://localhost:3002/oauth2/token'
        const userInfoURL = process.env.PIGX_SSO_USER_INFO_URL || 'http://localhost:3002/user/info'
        const scope = process.env.PIGX_SSO_SCOPE || 'server'
        console.log('Using authorizationURL:', authorizationURL)
        console.log('Using clientID:', clientID)
        console.log('Using clientSecret:', clientSecret)

        // Remove existing strategy if it exists
        if ((passport as any).strategies && (passport as any).strategies['pigx']) {
            delete (passport as any).strategies['pigx']
        }

        passport.use(
            'pigx',
            new OpenIDConnectStrategy(
                {
                    issuer: issuer,
                    authorizationURL: authorizationURL,
                    tokenURL: tokenURL,
                    userInfoURL: userInfoURL,
                    clientID: clientID,
                    clientSecret: clientSecret,
                    callbackURL: PigxSSO.getCallbackURL() || 'http://localhost:3000/api/v1/pigx/callback',
                    scope: scope,
                    passReqToCallback: true
                },
                async (
                    req: any,
                    issuer: string,
                    profile: Profile,
                    context: object,
                    idToken: string | object,
                    accessToken: string | object,
                    refreshToken: string,
                    done: VerifyCallback
                ) => {
                    if (profile.emails && profile.emails.length > 0) {
                        const email = profile.emails[0].value
                        return this.verifyAndLogin(this.app, email, done, profile, accessToken, refreshToken)
                    } else {
                        await auditService.recordLoginActivity(
                            '<empty>',
                            LoginActivityCode.UNKNOWN_USER,
                            ErrorMessage.UNKNOWN_USER,
                            this.getProviderName()
                        )
                        return done({ name: 'SSO_LOGIN_FAILED', message: ErrorMessage.UNKNOWN_USER }, undefined)
                    }
                }
            )
        )
    }

    initialize() {
        console.log('PigxSSO initialize called with config:', this.ssoConfig)
        // Always initialize the SSO config, even if it's not provided
        this.setSSOConfig(this.ssoConfig || {})

        this.app.get(PigxSSO.LOGIN_URI, (req, res, next?) => {
            console.log('PigxSSO login endpoint called')
            console.log('Request query:', req.query)
            console.log('Request headers:', req.headers)

            // 手动构建授权URL，确保client_id参数被正确传递
            const clientID = process.env.PIGX_SSO_CLIENT_ID || 'nikaflowise'
            const authorizationURL = process.env.PIGX_SSO_AUTHORIZATION_URL || 'http://localhost:3002/oauth2/authorize'
            const callbackURL = PigxSSO.getCallbackURL() || 'http://localhost:3000/api/v1/pigx/callback'
            const scope = process.env.PIGX_SSO_SCOPE || 'server'
            const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

            console.log('PigxSSO: Debug - scope value:', scope)
            console.log('PigxSSO: Debug - process.env.PIGX_SSO_SCOPE:', process.env.PIGX_SSO_SCOPE)

            // 存储state到session，用于后续验证
            const session = req.session as any
            session.pigxState = state

            // 构建完整的授权URL
            const authUrl = `${authorizationURL}?${new URLSearchParams({
                client_id: clientID,
                redirect_uri: callbackURL,
                response_type: 'code',
                scope: scope,
                state: state
            }).toString()}`
            console.log('PigxSSO1: Redirecting to authorization URL:', authUrl)
            res.redirect(authUrl)
        })

        this.app.get(PigxSSO.CALLBACK_URI, async (req, res, next?) => {
            console.log('PigxSSO callback endpoint called')
            console.log('Callback request query:', req.query)

            const { code, state, error, error_description } = req.query

            // 检查是否有错误
            if (error) {
                console.error('SSO error:', error, error_description)
                const errorObj = { message: error_description || String(error) }
                const signinUrl = `/signin?error=${encodeURIComponent(JSON.stringify(errorObj))}`
                return res.redirect(signinUrl)
            }

            // 验证state参数
            const session = req.session as any
            if (!state || state !== session.pigxState) {
                console.error('Invalid state parameter')
                const errorObj = { message: 'Invalid state parameter' }
                const signinUrl = `/signin?error=${encodeURIComponent(JSON.stringify(errorObj))}`
                return res.redirect(signinUrl)
            }

            // 交换授权码获取令牌
            try {
                const clientID = process.env.PIGX_SSO_CLIENT_ID || 'nikaflowise'
                const clientSecret = process.env.PIGX_SSO_CLIENT_SECRET || 'nikaflowise'
                const tokenURL = process.env.PIGX_SSO_TOKEN_URL || 'http://localhost:3002/oauth2/token'
                const callbackURL = PigxSSO.getCallbackURL() || 'http://localhost:3000/api/v1/pigx/callback'

                console.log('Exchanging code for token...')
                console.log('Token URL:', tokenURL)
                console.log('Client ID:', clientID)
                console.log('Client Secret:', clientSecret)
                console.log('Callback URL:', callbackURL)
                console.log('Code:', code)

                const tokenResponse = await axios.post(
                    tokenURL,
                    new URLSearchParams({
                        grant_type: 'authorization_code',
                        code: String(code),
                        redirect_uri: callbackURL,
                        client_id: clientID,
                        client_secret: clientSecret
                    }).toString(),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                )

                console.log('Token response status:', tokenResponse.status)
                console.log('Token response data:', tokenResponse.data)

                const { access_token, refresh_token, id_token } = tokenResponse.data

                // 获取用户信息
                const userInfoURL = process.env.PIGX_SSO_USER_INFO_URL || 'http://localhost:9999/admin/user/info'
                const userInfoResponse = await axios.get(userInfoURL, {
                    headers: {
                        Authorization: `Bearer ${access_token}`
                    }
                })

                console.log('User info response status:', userInfoResponse.status)
                console.log('User info response data:', userInfoResponse.data)

                let userInfo = userInfoResponse.data
                // Handle wrapped response (e.g. { code: 0, data: { ... } })
                if (userInfo.data && typeof userInfo.data === 'object') {
                    userInfo = userInfo.data
                }

                const email = userInfo.email || userInfo.username

                if (!email) {
                    throw new Error('No email found in user info')
                }

                // 使用verifyAndLogin方法登录用户
                const verifyCallback = (err?: Error | null, user?: any, info?: any) => {
                    try {
                        if (err || !user) {
                            const errorObj = { message: err?.message || 'Login failed' }
                            const signinUrl = `/signin?error=${encodeURIComponent(JSON.stringify(errorObj))}`
                            return res.redirect(signinUrl)
                        }

                        req.session.regenerate((regenerateErr) => {
                            if (regenerateErr) {
                                return next ? next(regenerateErr) : res.status(500).json({ message: 'Session regeneration failed' })
                            }

                            req.login(user, { session: true }, async (loginError) => {
                                if (loginError) return next ? next(loginError) : res.status(401).json(loginError)
                                return setTokenOrCookies(res, user, true, req, true, true)
                            })
                        })
                    } catch (error) {
                        return next ? next(error) : res.status(401).json(error)
                    }
                }

                // 创建一个模拟的profile对象
                const profile = {
                    emails: [{ value: email }],
                    id: userInfo.sub || userInfo.id || userInfo.userId,
                    displayName: userInfo.name || userInfo.username,
                    name: {
                        givenName: userInfo.given_name,
                        familyName: userInfo.family_name
                    }
                }
                console.log('登录profile data:', profile)
                await this.verifyAndLogin(this.app, email, verifyCallback, profile as any, access_token, refresh_token)
            } catch (error) {
                console.error('Token exchange failed:', error)
                if (axios.isAxiosError(error)) {
                    console.error('Axios error details:')
                    console.error('URL:', error.config?.url)
                    console.error('Method:', error.config?.method)
                    console.error('Data:', error.config?.data)
                    console.error('Response status:', error.response?.status)
                    console.error('Response data:', JSON.stringify(error.response?.data, null, 2))
                }
                const errorObj = { message: 'Token exchange failed: ' + (error as any).message }
                const signinUrl = `/signin?error=${encodeURIComponent(JSON.stringify(errorObj))}`
                return res.redirect(signinUrl)
            }
        })
    }

    static async testSetup(ssoConfig: any) {
        const { clientID, redirectURL } = ssoConfig

        try {
            const authorizationUrl = `${
                ssoConfig.authorizationURL || process.env.PIGX_SSO_AUTHORIZATION_URL || 'http://localhost:3002/oauth2/authorize'
            }?${new URLSearchParams({
                client_id: clientID,
                redirect_uri: redirectURL,
                response_type: process.env.PIGX_SSO_RESPONSE_TYPE || 'code',
                scope: process.env.PIGX_SSO_SCOPE || 'server'
            }).toString()}`

            const tokenResponse = await axios.get(authorizationUrl)
            return { message: tokenResponse.statusText }
        } catch (error) {
            const errorMessage = 'Pigx Configuration test failed. Please check your credentials.'
            return { error: errorMessage }
        }
    }

    async refreshToken(ssoRefreshToken: string) {
        const { clientID, clientSecret, tokenURL } = this.ssoConfig

        try {
            const response = await axios.post(
                tokenURL || process.env.PIGX_SSO_TOKEN_URL || 'http://localhost:3002/oauth2/token',
                new URLSearchParams({
                    client_id: clientID || process.env.PIGX_SSO_CLIENT_ID || 'pig',
                    client_secret: clientSecret || process.env.PIGX_SSO_CLIENT_SECRET || 'pig',
                    grant_type: 'refresh_token',
                    refresh_token: ssoRefreshToken,
                    scope: process.env.PIGX_SSO_SCOPE || 'server'
                }).toString(),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            )
            return { ...response.data }
        } catch (error) {
            const errorMessage = 'Failed to get refreshToken from Pigx.'
            return { error: errorMessage }
        }
    }
}

export default PigxSSO
