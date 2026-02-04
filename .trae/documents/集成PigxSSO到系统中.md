# 集成PigxSSO到系统中（完整方案）

## 1. 后端修改

### 1.1 修改 IdentityManager.ts

#### 在SSO 中创建对应的PigxSSO类
可以参考其他SSO类的实现，如AzureSSO、GoogleSSO等。

#### 1.1.1 添加 PigxSSO 导入
在文件顶部添加：
```typescript
import PigxSSO from './enterprise/sso/PigxSSO'
```

#### 1.1.2 更新 SSO 提供商列表
修改 `allSSOProviders` 数组，添加 'pigx'：
```typescript
const allSSOProviders = ['azure', 'google', 'auth0', 'github', 'pigx']
```

#### 1.1.3 添加 PigxSSO 初始化逻辑
在 `initializeSsoProvider` 方法的 switch 语句中添加：
```typescript
case 'pigx': {
    const pigxSSO = new PigxSSO(app, providerConfig)
    pigxSSO.initialize()
    this.ssoProviders.set(providerName, pigxSSO)
    break
}
```

### 1.2 修改 login-method.controller.ts

#### 1.2.1 添加 PigxSSO 导入
在文件顶部添加：
```typescript
import PigxSSO from '../sso/PigxSSO'
```

#### 1.2.2 更新回调URL配置
在 `read` 方法的 `loginMethodConfig.callbacks` 数组中添加：
```typescript
{ providerName: 'pigx', callbackURL: PigxSSO.getCallbackURL() }
```

#### 1.2.3 在SSOBase 中创建用户方法
在enterprise 创建了nika目录，在nika目录中创建了NikaUser类，用于创建用户。
SSOBase 中添加了createNewSSOUser方法，用于创建用户。


#### 1.2.4 更新测试配置方法
在 `testConfig` 方法中添加：
```typescript
} else if (req.body.providerName === 'pigx') {
    const response = await PigxSSO.testSetup(providers[0].config)
    return res.json(response)
}
```



## 2. 前端修改

### 2.1 添加 PigxSSO 图标
在 `packages/ui/src/assets/images/` 目录中添加 `pigx.svg` 图标文件

### 2.2 修改 signIn.jsx

#### 2.2.1 添加 PigxSSO 图标导入
在文件顶部的图标导入部分添加：
```javascript
import PigxSSOLoginIcon from '@/assets/images/pigx.svg'
```

#### 2.2.2 添加 PigxSSO 登录按钮
在 SSO 登录按钮映射部分添加：
```javascript
{configuredSsoProviders &&
    configuredSsoProviders.map(
        (ssoProvider) =>
            ssoProvider === 'pigx' && (
                <Button
                    key={ssoProvider}
                    variant='outlined'
                    style={{ borderRadius: 12, height: 45, marginRight: 5, lineHeight: 0 }}
                    onClick={() => signInWithSSO(ssoProvider)}
                    startIcon={
                        <Icon>
                            <img src={PigxSSOLoginIcon} alt={'PigxSSO'} width={20} height={20} />
                        </Icon>
                    }
                >
                    Sign In With Pigx
                </Button>
            )
    )}
```

### 2.3 修改 ssoConfig.jsx（管理界面配置）
在 `packages/ui/src/views/auth/ssoConfig.jsx` 中添加 PigxSSO 配置选项

## 3. 配置修改

### 3.1 环境变量配置
在 `.env` 文件中添加以下 Pigx SSO 相关的环境变量：

```env
# Pigx SSO Configuration
PIGX_SSO_CLIENT_ID=your_pigx_client_id
PIGX_SSO_CLIENT_SECRET=your_pigx_client_secret
PIGX_SSO_ISSUER=http://your-pigx-server:3002
PIGX_SSO_AUTHORIZATION_URL=http://your-pigx-server:3002/oauth2/authorize
PIGX_SSO_TOKEN_URL=http://your-pigx-server:3002/oauth2/token
PIGX_SSO_USER_INFO_URL=http://your-pigx-server:3002/user/info
PIGX_SSO_SCOPE=server
```

### 3.2 管理界面配置
在 Flowise 管理界面中，导航到：
1. 登录方法配置页面
2. 点击 "添加登录方法"
3. 选择 "Pigx SSO"
4. 填写配置信息并保存

## 4. 流程说明

### 4.1 登录流程
1. 用户访问登录页面
2. 系统显示 Pigx SSO 登录按钮
3. 用户点击 "Sign In With Pigx" 按钮
4. 系统重定向到 Pigx SSO 登录页面
5. 用户在 Pigx 系统中登录
6. Pigx 系统重定向回 Flowise 的回调地址
7. Flowise 处理回调，验证用户信息
8. 用户登录成功，进入 Flowise 系统

### 4.2 回调处理
1. PigxSSO.ts 中的 `CALLBACK_URI` 端点接收回调请求
2. 验证 state 参数防止 CSRF 攻击
3. 交换授权码获取访问令牌
4. 使用访问令牌获取用户信息
5. 调用 `verifyAndLogin` 方法登录用户
6. 设置用户会话和令牌
7. 重定向用户到系统首页

## 5. 验证集成

### 5.1 重启服务
重启 Flowise 服务器以应用所有更改：
```bash
# 在项目根目录执行
npm run start
```

### 5.2 测试步骤
1. **前端显示测试**：访问登录页面，确认 Pigx SSO 登录按钮显示
2. **登录流程测试**：点击 Pigx 登录按钮，完成整个登录流程
3. **回调测试**：确保 Pigx 系统能正确重定向回 Flowise
4. **用户认证测试**：确认登录后用户能正常访问系统功能
5. **错误处理测试**：测试各种错误场景，如无效凭证、取消登录等

### 5.3 日志检查
检查服务器日志，确保：
- PigxSSO 初始化成功
- 无错误信息
- 登录流程正常记录

## 6. 优化和调整

### 6.1 移除调试日志
从 `PigxSSO.ts` 中移除或注释掉调试日志语句，以减少生产环境中的日志输出

### 6.2 错误处理优化
确保错误处理逻辑与系统其他部分保持一致，提供清晰的错误信息

### 6.3 安全检查
- 确保所有敏感信息都通过环境变量配置
- 验证 state 参数防止 CSRF 攻击
- 确保令牌安全存储和传输

### 6.4 性能优化
- 优化 HTTP 请求处理
- 减少不必要的日志输出
- 确保回调处理高效执行

## 7. 问题排查

### 7.1 常见问题
1. **登录按钮不显示**：检查 `allSSOProviders` 数组是否包含 'pigx'
2. **回调失败**：检查回调 URL 配置是否正确
3. **环境变量未生效**：检查 `.env` 文件配置和加载情况
4. **Pigx 配置错误**：检查 Pigx 系统的客户端配置

### 7.2 排查步骤
1. 检查服务器日志获取详细错误信息
2. 验证环境变量配置
3. 检查网络请求和响应
4. 测试 Pigx 系统的 API 可用性
5. 验证回调 URL 是否可访问

## 8. 文档更新

### 8.1 配置文档
更新系统配置文档，添加 Pigx SSO 配置说明：
- 环境变量配置
- 管理界面配置
- Pigx 系统配置要求

### 8.2 登录流程文档
更新登录流程文档，添加 Pigx SSO 登录说明：
- 登录按钮位置和使用方法
- 登录流程步骤
- 常见问题和解决方案

## 9. 总结

本方案完整覆盖了 PigxSSO 的集成过程，包括：
- 后端配置和初始化
- 前端登录按钮显示
- 环境变量配置
- 登录流程和回调处理
- 测试和问题排查
- 文档更新

按照此方案实施后，用户将能够通过 Pigx SSO 系统安全登录 Flowise，享受统一身份认证的便捷性。