# 美乐蒂工作台 - 部署教程

## 目录
1. [本地使用](#本地使用)
2. [Supabase 云端配置](#supabase-云端配置)
3. [手机添加桌面小组件](#手机添加桌面小组件)
4. [部署到云端服务器](#部署到云端服务器)
5. [常见问题](#常见问题)

---

## 本地使用

### 方式一：直接打开（最简单）
1. 双击 `index.html` 即可在浏览器中打开
2. 所有功能可用，数据存储在浏览器本地
3. **注意**：file:// 协议下 Service Worker 不可用，PWA 离线功能需要通过 HTTP 访问

### 方式二：本地服务器（推荐）
```bash
# 进入工作台目录
cd melodi-workbench

# 使用 Python 启动本地服务器
python -m http.server 8080

# 或使用 Node.js
npx serve .
```
浏览器打开 `http://localhost:8080` 即可使用全部功能（含 PWA 离线缓存）。

---

## Supabase 云端配置

### 第一步：注册 Supabase 账号
1. 访问 https://supabase.com
2. 点击 "Start your project" 注册免费账号（支持 GitHub 登录）
3. 免费额度：500MB 数据库存储 + 1GB 文件存储 + 50000 月活用户，完全够用

### 第二步：创建项目
1. 点击 "New Project"
2. 填写项目名称（如 `melodi-workbench`）
3. 设置数据库密码（记住它，后面用不到但不丢失）
4. 选择离你最近的区域（如 Northeast Asia - Tokyo / Singapore）
5. 点击 "Create new project"，等待 1-2 分钟初始化

### 第三步：创建数据表
1. 进入项目后，点击左侧 "SQL Editor"
2. 点击 "New query"
3. 复制以下 SQL 全部粘贴进去，点击 "Run" 执行：

```sql
-- 每日数据表（睡眠、饮食、运动、打卡等按日期存储的数据）
CREATE TABLE IF NOT EXISTS melodi_daily (
  id BIGSERIAL PRIMARY KEY,
  module TEXT NOT NULL,
  date_key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  device_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module, date_key)
);

-- 列表数据表（任务、灵感、书单、观影记录等）
CREATE TABLE IF NOT EXISTS melodi_lists (
  id BIGSERIAL PRIMARY KEY,
  list_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '[]',
  device_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用行级安全（RLS）
ALTER TABLE melodi_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE melodi_lists ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户读写（个人使用，简化配置）
CREATE POLICY "Allow all for daily" ON melodi_daily FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for lists" ON melodi_lists FOR ALL USING (true) WITH CHECK (true);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER melodi_daily_updated BEFORE UPDATE ON melodi_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER melodi_lists_updated BEFORE UPDATE ON melodi_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

4. 执行成功后会显示 "Success. No rows returned"

### 第四步：获取 API 密钥
1. 点击左侧 "Settings"（齿轮图标）> "API"
2. 找到以下两项：
   - **Project URL**：类似 `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**：一长串 `eyJhbGciOi...` 开头的字符串

### 第五步：在工作台中绑定 Supabase
1. 打开美乐蒂工作台
2. 点击左侧侧边栏底部的 **设置** 按钮
3. 在 "Supabase 云端配置" 区域：
   - **Supabase URL** 粘贴 Project URL
   - **Supabase Anon Key** 粘贴 anon public key
4. 点击 **连接云端** 按钮
5. 连接成功后，同步状态会变为 "云端已连接"
6. 点击 **立即同步** 可手动触发全量同步

### 同步说明
- **自动同步**：每次新增打卡、保存数据后，2秒后自动推送到云端
- **启动同步**：每次打开工作台时自动拉取云端最新数据
- **离线模式**：断网时数据保存在本地，联网后自动同步
- **多设备同步**：在手机和电脑上配置相同的 Supabase URL 和 Key，数据自动双向同步

---

## 手机添加桌面小组件

### 工作台主应用添加到桌面

#### iPhone (iOS)
1. 用 Safari 打开工作台网址（必须是 HTTPS 地址）
2. 点击底部 **分享** 按钮（方框向上箭头图标）
3. 滑动找到 **添加到主屏幕**
4. 点击 **添加**，桌面会出现美乐蒂图标
5. 点击桌面图标即可全屏打开工作台（无浏览器地址栏）

#### Android
1. 用 Chrome 打开工作台网址
2. 点击右上角 **三个点** 菜单
3. 选择 **添加到主屏幕** 或 **安装应用**
4. 确认添加，桌面会出现美乐蒂图标
5. 点击图标即可打开工作台

### 桌面小组件页面（widget.html）

工作台自带一个独立的小组件页面 `widget.html`，包含：
- 实时时间日期
- 当日全部打卡总览
- 每日中英励志短句

#### 添加小组件到桌面
1. 先确保工作台已添加到手机桌面（见上方步骤）
2. 用浏览器打开 `工作台地址/widget.html`
3. 按照与上方相同的步骤添加到主屏幕
4. 这样桌面上会有两个图标：主工作台 + 小组件

#### 小组件功能说明
- **实时时间**：每秒自动刷新显示当前时间
- **打卡总览**：8 项打卡进度（睡眠/饮水/饮食/运动/面膜/养生/学习/休闲）
- **完成率进度条**：直观显示今日完成度
- **励志短句**：30 条中英双语短句，基于日期每日自动换新

---

## 部署到云端服务器

### 方式一：CloudStudio 部署（推荐）
1. 将 `melodi-workbench` 文件夹部署到 CloudStudio 静态托管
2. 获取 HTTPS 访问地址
3. 手机和电脑均可通过该地址访问

### 方式二：Vercel / Netlify 部署
1. 将 `melodi-workbench` 文件夹上传到 GitHub 仓库
2. 在 Vercel 或 Netlify 中导入该仓库
3. 部署后会获得 HTTPS 地址
4. 无需构建步骤，直接部署静态文件

### 方式三：GitHub Pages
1. 创建 GitHub 仓库，上传 `melodi-workbench` 全部文件
2. 进入仓库 Settings > Pages
3. Source 选择 main 分支，文件夹选 root 或 /docs
4. 保存后等待 1-2 分钟，获得 `https://用户名.github.io/仓库名/` 地址

### 方式四：自有服务器
1. 将 `melodi-workbench` 文件夹上传到服务器 web 目录
2. 配置 Nginx/Apache 指向该目录
3. 建议配置 HTTPS（PWA 和手机桌面图标需要 HTTPS）

---

## 常见问题

### Q: 打开页面是空白？
A: 确保通过 HTTP/HTTPS 访问（不是 file://），或尝试刷新页面清除缓存。

### Q: 数据会丢失吗？
A: 不会。所有数据先保存在浏览器 LocalStorage（永久），配置 Supabase 后还会同步到云端。即使清空浏览器缓存，云端数据仍在。

### Q: 手机和电脑数据如何同步？
A: 两端配置相同的 Supabase URL 和 Key 即可。每次打开自动拉取最新数据，每次操作自动推送。

### Q: Service Worker 是什么？
A: 它让工作台可以离线使用。首次访问后，页面资源被缓存，断网后仍可打开。数据保存在本地，联网后自动同步到云端。

### Q: 如何备份数据？
A: 设置页 > 数据管理 > 导出全部数据，会下载 JSON 备份文件。可随时导入恢复。

### Q: 侧边栏顺序能改吗？
A: 基础 13 项固定排序永久锁定。支持在底部 "新增分类" 添加自定义栏目，自定义栏目可删除。

### Q: 运势分析的生日怎么改？
A: 设置页 > 个人信息 > 生日，修改后保存即可。默认 2000-10-22。

---

*美乐蒂工作台 v1.0 - 适配 ADHD 的大女主自我管理系统*
