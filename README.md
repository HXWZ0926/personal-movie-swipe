# 刷片夹

个人影视刷卡整理工具，当前同时保留网页版本和 Windows 本地 App 版本。

## 网页版本

双击：

```bat
start-web.cmd
```

然后打开：

```text
http://127.0.0.1:3000
```

网页版本使用 Next.js + React + TypeScript + Tailwind CSS，数据保存在浏览器 `localStorage`。

## 本地 App 版本

双击：

```bat
刷片夹.vbs
```

## 网页功能

- 刷卡推荐：看过、想看、跳过
- 加权随机推荐
- 首页搜索添加看过作品
- TVMaze 在线搜索，TMDb / OMDb / Trakt / Watchmode 可配置 API Key
- 我的片单：看过、想看、跳过
- 已添加作品搜索和自定义片单过滤
- 作品详情
- 个人评分、影评、观看日期、观看平台、二刷、私人标签、自定义片单
- 统计页
- 导出完整 JSON
- 导出看过 CSV
- 导入 JSON 备份
