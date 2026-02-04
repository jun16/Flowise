# Flowise 数据库结构分析

## 1. 数据库表完整列表

| 表名                   | 用途说明                   |
| ---------------------- | -------------------------- |
| ChatFlow               | 存储聊天流程配置和相关数据 |
| ChatMessage            | 存储聊天消息记录           |
| ChatMessageFeedback    | 存储消息反馈信息           |
| Credential             | 存储凭证信息               |
| Tool                   | 存储工具配置               |
| Assistant              | 存储助手配置               |
| Variable               | 存储变量配置               |
| DocumentStore          | 存储文档存储配置           |
| DocumentStoreFileChunk | 存储文档文件分块信息       |
| Lead                   | 存储潜在客户信息           |
| UpsertHistory          | 存储更新历史记录           |
| Dataset                | 存储数据集配置             |
| DatasetRow             | 存储数据集中的行数据       |
| EvaluationRun          | 存储评估运行记录           |
| Evaluation             | 存储评估配置和结果         |
| Evaluator              | 存储评估器配置             |
| ApiKey                 | 存储 API 密钥信息          |
| CustomTemplate         | 存储自定义模板             |
| Execution              | 存储执行记录               |
| User                   | 存储用户信息               |
| Organization           | 存储组织信息               |
| Role                   | 存储角色和权限配置         |
| OrganizationUser       | 存储组织用户关联信息       |
| Workspace              | 存储工作空间配置           |
| WorkspaceUser          | 存储工作空间用户关联信息   |
| LoginMethod            | 存储登录方法配置           |
| LoginSession           | 存储登录会话信息           |
| LoginActivity          | 存储登录活动记录           |

## 2. 详细表结构

### 2.1 ChatFlow 表

| 字段名          | 数据类型    | 约束条件           | 字段说明       |
| --------------- | ----------- | ------------------ | -------------- |
| id              | uuid        | PRIMARY KEY        | 流程 ID        |
| name            | varchar     | NOT NULL           | 流程名称       |
| flowData        | text        | NOT NULL           | 流程配置数据   |
| deployed        | boolean     | NULL               | 是否已部署     |
| isPublic        | boolean     | NULL               | 是否公开       |
| apikeyid        | varchar     | NULL               | API 密钥 ID    |
| chatbotConfig   | text        | NULL               | 聊天机器人配置 |
| apiConfig       | text        | NULL               | API 配置       |
| analytic        | text        | NULL               | 分析配置       |
| speechToText    | text        | NULL               | 语音转文本配置 |
| textToSpeech    | text        | NULL               | 文本转语音配置 |
| followUpPrompts | text        | NULL               | 后续提示配置   |
| category        | text        | NULL               | 分类           |
| type            | varchar(20) | DEFAULT 'CHATFLOW' | 流程类型       |
| createdDate     | timestamp   | NOT NULL           | 创建日期       |
| updatedDate     | timestamp   | NOT NULL           | 更新日期       |
| workspaceId     | text        | NOT NULL           | 工作空间 ID    |

### 2.2 ChatMessage 表

| 字段名          | 数据类型  | 约束条件        | 字段说明       |
| --------------- | --------- | --------------- | -------------- |
| id              | uuid      | PRIMARY KEY     | 消息 ID        |
| role            | varchar   | NOT NULL        | 消息角色       |
| chatflowid      | uuid      | NOT NULL, INDEX | 流程 ID        |
| executionId     | uuid      | NULL            | 执行 ID        |
| content         | text      | NOT NULL        | 消息内容       |
| sourceDocuments | text      | NULL            | 源文档信息     |
| usedTools       | text      | NULL            | 使用的工具     |
| fileAnnotations | text      | NULL            | 文件注释       |
| agentReasoning  | text      | NULL            | 代理推理过程   |
| fileUploads     | text      | NULL            | 文件上传信息   |
| artifacts       | text      | NULL            | artifacts 信息 |
| action          | text      | NULL            | 操作信息       |
| chatType        | varchar   | NOT NULL        | 聊天类型       |
| chatId          | varchar   | NOT NULL        | 聊天 ID        |
| memoryType      | varchar   | NULL            | 内存类型       |
| sessionId       | varchar   | NULL            | 会话 ID        |
| createdDate     | timestamp | NOT NULL        | 创建日期       |
| leadEmail       | text      | NULL            | 潜在客户邮箱   |
| followUpPrompts | text      | NULL            | 后续提示       |

### 2.3 User 表

| 字段名      | 数据类型     | 约束条件             | 字段说明     |
| ----------- | ------------ | -------------------- | ------------ |
| id          | uuid         | PRIMARY KEY          | 用户 ID      |
| name        | varchar(100) | NOT NULL             | 用户名       |
| email       | varchar(255) | NOT NULL, UNIQUE     | 邮箱         |
| credential  | text         | NULL                 | 凭证信息     |
| tempToken   | text         | NULL, UNIQUE         | 临时令牌     |
| tokenExpiry | timestamp    | NULL                 | 令牌过期时间 |
| status      | varchar(20)  | DEFAULT 'unverified' | 用户状态     |
| createdDate | timestamp    | NOT NULL             | 创建日期     |
| updatedDate | timestamp    | NOT NULL             | 更新日期     |
| createdBy   | varchar      | NOT NULL             | 创建人 ID    |
| updatedBy   | varchar      | NOT NULL             | 更新人 ID    |

### 2.4 Role 表

| 字段名         | 数据类型     | 约束条件    | 字段说明  |
| -------------- | ------------ | ----------- | --------- |
| id             | uuid         | PRIMARY KEY | 角色 ID   |
| organizationId | varchar      | NULL        | 组织 ID   |
| name           | varchar(100) | NOT NULL    | 角色名称  |
| description    | text         | NULL        | 角色描述  |
| permissions    | text         | NOT NULL    | 权限配置  |
| createdDate    | timestamp    | NOT NULL    | 创建日期  |
| updatedDate    | timestamp    | NOT NULL    | 更新日期  |
| createdBy      | varchar      | NULL        | 创建人 ID |
| updatedBy      | varchar      | NULL        | 更新人 ID |

### 2.5 Organization 表

| 字段名         | 数据类型     | 约束条件                       | 字段说明  |
| -------------- | ------------ | ------------------------------ | --------- |
| id             | uuid         | PRIMARY KEY                    | 组织 ID   |
| name           | varchar(100) | DEFAULT 'Default Organization' | 组织名称  |
| customerId     | varchar(100) | NULL                           | 客户 ID   |
| subscriptionId | varchar(100) | NULL                           | 订阅 ID   |
| createdDate    | timestamp    | NOT NULL                       | 创建日期  |
| updatedDate    | timestamp    | NOT NULL                       | 更新日期  |
| createdBy      | varchar      | NOT NULL                       | 创建人 ID |
| updatedBy      | varchar      | NOT NULL                       | 更新人 ID |

### 2.6 Workspace 表

| 字段名         | 数据类型     | 约束条件                     | 字段说明     |
| -------------- | ------------ | ---------------------------- | ------------ |
| id             | uuid         | PRIMARY KEY                  | 工作空间 ID  |
| name           | varchar(100) | DEFAULT 'Personal Workspace' | 工作空间名称 |
| description    | text         | NULL                         | 工作空间描述 |
| organizationId | varchar      | NOT NULL                     | 组织 ID      |
| createdDate    | timestamp    | NOT NULL                     | 创建日期     |
| updatedDate    | timestamp    | NOT NULL                     | 更新日期     |
| createdBy      | varchar      | NOT NULL                     | 创建人 ID    |
| updatedBy      | varchar      | NOT NULL                     | 更新人 ID    |

### 2.7 其他核心表

#### 2.7.1 WorkspaceUser 表

-   存储工作空间与用户的关联关系
-   包含工作空间 ID、用户 ID、角色 ID 等字段

#### 2.7.2 OrganizationUser 表

-   存储组织与用户的关联关系
-   包含组织 ID、用户 ID、角色 ID 等字段

#### 2.7.3 LoginMethod 表

-   存储登录方法配置
-   包含用户 ID、登录类型、配置信息等字段

#### 2.7.4 LoginSession 表

-   存储登录会话信息
-   包含用户 ID、会话令牌、过期时间等字段

#### 2.7.5 Credential 表

-   存储凭证信息
-   包含凭证名称、类型、配置数据等字段

#### 2.7.6 Tool 表

-   存储工具配置
-   包含工具名称、类型、配置数据等字段

#### 2.7.7 DocumentStore 表

-   存储文档存储配置
-   包含存储名称、类型、配置数据等字段

#### 2.7.8 Dataset 表

-   存储数据集配置
-   包含数据集名称、类型、配置数据等字段

#### 2.7.9 ApiKey 表

-   存储 API 密钥信息
-   包含密钥名称、值、过期时间等字段

## 3. 表关系描述

### 3.1 核心关系

1. **用户与组织关系**

    - User ↔ Organization: 多对多，通过 OrganizationUser 表关联
    - Organization → User: 一对多（创建人和更新人）

2. **用户与工作空间关系**

    - User ↔ Workspace: 多对多，通过 WorkspaceUser 表关联
    - Workspace → User: 一对多（创建人和更新人）

3. **组织与工作空间关系**

    - Organization → Workspace: 一对多（一个组织可以有多个工作空间）

4. **角色与权限关系**

    - Role → Organization: 多对一（角色属于某个组织）
    - Role → User: 多对一（创建人和更新人）

5. **工作空间与流程关系**

    - Workspace → ChatFlow: 一对多（一个工作空间可以有多个流程）

6. **流程与消息关系**

    - ChatFlow → ChatMessage: 一对多（一个流程可以有多个消息）

7. **消息与执行关系**
    - ChatMessage → Execution: 一对一（一个消息关联一个执行）

### 3.2 权限管理相关关系

1. **用户-角色-权限**

    - User → Role: 多对多（通过 OrganizationUser 和 WorkspaceUser 表关联）
    - Role → Permissions: 一对一（角色包含权限配置）

2. **权限继承关系**
    - 组织级角色权限会传递到工作空间级别
    - 工作空间级角色权限会传递到具体资源（如流程、凭证等）

## 4. 用户权限管理相关表

### 4.1 核心权限管理表

| 表名             | 权限管理功能                             |
| ---------------- | ---------------------------------------- |
| User             | 存储用户基本信息和状态                   |
| Role             | 存储角色定义和权限配置                   |
| Organization     | 存储组织信息，作为权限管理的顶级单位     |
| OrganizationUser | 管理用户在组织中的角色分配               |
| Workspace        | 存储工作空间信息，作为权限管理的次级单位 |
| WorkspaceUser    | 管理用户在工作空间中的角色分配           |
| LoginMethod      | 管理用户登录方式和认证配置               |
| LoginSession     | 管理用户登录会话和访问控制               |

### 4.2 权限控制机制

1. **基于角色的访问控制 (RBAC)**

    - 通过 Role 表定义不同角色的权限
    - 权限以 JSON 格式存储在 permissions 字段中
    - 支持组织级和工作空间级的角色管理

2. **角色类型**

    - 系统预定义角色：owner、member、personal workspace
    - 自定义角色：可根据需要创建特定权限的角色

3. **权限继承**

    - 组织级角色权限会传递到工作空间
    - 工作空间级角色权限会传递到具体资源

4. **用户状态管理**

    - 支持多种用户状态：active、invited、unverified、deleted
    - 不同状态对应不同的访问权限

5. **认证与授权**
    - 通过 LoginMethod 管理多种登录方式（如邮箱密码、SSO 等）
    - 通过 LoginSession 管理用户会话和访问令牌

## 5. 数据库结构特点

1. **UUID 主键**：所有表都使用 UUID 作为主键，确保全局唯一性

2. **时间戳字段**：所有表都包含 createdDate 和 updatedDate 字段，用于跟踪数据变更

3. **软删除支持**：通过 status 字段实现软删除功能

4. **灵活的配置存储**：使用 text 类型存储 JSON 格式的配置数据，提高系统灵活性

5. **完整的审计跟踪**：通过 createdBy 和 updatedBy 字段实现操作审计

6. **模块化设计**：按功能模块划分表结构，提高系统可维护性

7. **企业级权限管理**：支持组织、工作空间、角色的多层次权限管理

## 6. 总结

Flowise 数据库结构设计合理，采用了模块化、层次化的设计理念，既满足了业务功能需求，又提供了灵活的权限管理机制。数据库表结构清晰，字段命名规范，关系定义明确，为系统的稳定运行和功能扩展提供了坚实的基础。

特别是在用户权限管理方面，Flowise 实现了完整的 RBAC 权限控制体系，支持组织和工作空间的多层次管理，能够满足企业级应用的权限控制需求。

通过对数据库结构的分析，我们可以看出 Flowise 是一个设计成熟、功能完善的应用程序，具备良好的可扩展性和可维护性。
