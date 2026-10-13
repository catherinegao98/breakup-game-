# 情侣分手指南 · 六人朋友局

为 `catherinegao98/breakup-game-` 准备的 GitHub Pages 网站。六名玩家、一人兼任 DM；爆料和惩罚使用你确认的豆包自定义内容，其余图片来自你提供的 PDF。

## 先看清楚现在的状态

- 网站代码和卡牌图片已准备好，config.js 已填入你提供的 game-e194e 项目配置和数据库地址；尚未代你上传 GitHub。
- Firebase 控制台中的匿名登录、授权域名及数据库规则仍需你按下文确认完成；真实联机尚未验证。
- 未配置 Firebase 时，首页「打开单机演示」可完整体验页面。演示不联机、不保留进度。
- 联机版采用 Firebase 匿名登录 + Realtime Database + DM 浏览器处理请求，不需要自建服务器，不使用付费 Cloud Functions。
- DM 正常页面不显示其他人的手牌或隐藏礼物。房主拥有底层数据权限，技术上仍可检查这些内容，适合互相信任的朋友。
- DM 必须保持页面开启、网络在线；建议电脑或平板主持。手机锁屏、浏览器进入后台可能暂停处理，恢复页面后继续。
- 美德打牌、航行行动、船位、落水、猜拳和表演在线下进行；网站负责卡牌图片查阅、航行事件抽取以及 DM 手动记分。

## 第一步：创建 Firebase 项目

1. 打开 <https://console.firebase.google.com/>，登录你的 Google 账号。
2. 创建项目，例如 `breakup-game`；Google Analytics 可以不开启。
3. 本项目按免费 Spark 方案设计，不需要为此启用按量计费。免费额度仍有限，请以控制台 Usage/用量页面为准。
4. 项目主页添加 Web 应用（`</>` 图标），应用名任意。不必开启 Firebase Hosting，因为网站将放在 GitHub Pages。
5. 注册后复制 `firebaseConfig` 对象。

## 第二步：启用匿名登录

1. 左侧 Build / 构建 → Authentication。
2. 点击 Get started / 开始使用。
3. Sign-in method / 登录方式 → Anonymous / 匿名 → Enable / 启用 → 保存。
4. 在 Authentication → Settings / 设置 → Authorized domains / 授权域名中添加：

   ```text
   catherinegao98.github.io
   ```

5. 如果要本机开发，再添加 `localhost`；不需要把仓库名或 `https://` 填进域名字段。

匿名身份保存在当前浏览器。同一台设备上的不同浏览器，是不同玩家；同一浏览器的多个普通标签页，共用同一身份。

## 第三步：创建数据库，并发布权限规则

1. 左侧 Build / 构建 → Realtime Database → Create database / 创建数据库。
2. 选择可用区域，先使用 **Locked mode / 锁定模式**。
3. 创建后复制数据库 URL；它可能是 `https://某名称-default-rtdb.firebaseio.com`，也可能包含地区域名。请复制你自己的实际地址。
4. 数据库 → Rules / 规则。
5. 用文本编辑器打开本上传包中的 `database.rules.json`，复制完整内容，替换控制台里的规则。
6. 点击 Publish / 发布。

**不要用 `.read: true`、`.write: true` 的公开测试规则替代。** 本包规则使普通玩家无法直接读别人私牌、写分数或重置房间。玩家只能在空闲座位入座，并向 DM 提交自己的操作请求。

房间号相当于邀请凭证，分享给本局朋友即可。知道房间号并完成匿名登录的人可以看到公共状态；私密手牌仍按用户 ID 限制读取。

## 第四步：填写 config.js

用记事本或代码编辑器打开 `config.js`。保留 `export const firebaseConfig =`，把值换成刚才复制的配置。示例仅展示结构：

```js
export const firebaseConfig = {
  apiKey: "从控制台复制",
  authDomain: "你的项目.firebaseapp.com",
  databaseURL: "你在 Realtime Database 中复制的真实地址",
  projectId: "你的项目ID",
  appId: "从控制台复制"
};
```

如果控制台的配置没有 `databaseURL`，手动加上。也可以保留控制台提供的 `storageBucket`、`messagingSenderId` 等额外字段。

这个 Web 配置会随网页公开，属于预期行为；访问控制靠数据库规则。**不要放入服务账户 JSON、私钥、密码、GitHub token。**

## 第五步：上传你的 GitHub 仓库

仓库：<https://github.com/catherinegao98/breakup-game->，当前默认分支为 `main`。

1. 解压上传包，进入 `breakup-game` 文件夹。
2. 登录 GitHub，打开上面的仓库。
3. 点击 Add file → Upload files。
4. 先上传根目录文件：`index.html`、`style.css`、`app.js`、`engine.js`、`cards.js`、`assets.js`、**填好配置的 `config.js`**、`database.rules.json`、`package.json`、`README.md`。README 可替换仓库中原先只有标题的版本。
5. 页面底部点击 Commit changes，提交到 `main`。
6. 再次 Add file → Upload files，把整个 **`assets` 文件夹**拖入，确认路径是 `assets/文件名.jpg`，再 Commit changes。这里有88张图片，单独这一批小于100个文件。
7. 再次上传整个 **`rule-images` 文件夹**，确认路径是 `rule-images/文件名.jpg`，提交。这里有14张规则图片。
8. `tests` 文件夹可以一并上传用于保留测试；它不是运行网站的必要文件。
9. `.nojekyll` 是隐藏文件，可用 Add file → Create new file，新文件名填 `.nojekyll`，内容留空并提交；无法提交空内容时可填一行 `# static site`。

**必须把文件放在仓库根目录，而不是再套一层 `breakup-game/` 文件夹。也不要只上传 ZIP，GitHub Pages 不会自动解压它。**

最终结构应类似：

```text
breakup-game- 仓库根目录
├── index.html
├── config.js
├── app.js
├── engine.js
├── cards.js
├── assets.js
├── style.css
├── database.rules.json
├── package.json
├── README.md
├── .nojekyll
├── assets/
│   └── 88张卡牌图片
├── rule-images/
│   └── 14张规则图片
└── tests/                  可选
```

GitHub 官方 Pages 配置说明：<https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>

## 第六步：开启 GitHub Pages

1. 仓库 → Settings → 左侧 Pages。
2. Build and deployment → Source 选择 **Deploy from a branch**。
3. Branch 选择 **main**，目录选择 **/(root)**。
4. 点击 Save。
5. 等待 Actions 中 Pages 部署成功，再打开：

   <https://catherinegao98.github.io/breakup-game-/>

这是预计发布地址；只有你完成上传和 Pages 部署后才会有网站。注意末尾仓库名中的短横线。

## 开局流程

1. 六个人先用实际手机网络打开网页，确认能加载 Firebase；不同地区和网络的可达性需要实测。
2. 兼任 DM 的玩家点击「我是兼任 DM，创建房间」，选择自己扮演的角色。
3. 点击「复制邀请链接」，发给另外五人。
4. 五人各自用独立浏览器打开链接，选择自己的角色。角色一旦占用，别人不能再选。
5. DM 在「DM 控台」设置第三次受罚加分口径。手册第50页有「每次 +5」与第三次「额外 +5」两处表述，默认第三次合计 +10；如果你们裁定第三次总共只 +5，开局前选择额外0。
6. 六人到齐后，DM 进入节目开场，完成线下介绍，再进入爆料。系统随机发18张自定义爆料，每人3张。
7. 当前出牌玩家在「我的手牌」打出一张，选择被询问的人和宣称的角色。事件内容在线下念出。
8. 被询问玩家选择相信／质疑：系统公开卡片、判断受罚者、记分、抽对应惩罚。选择私下查看：牌移交给该玩家，由其继续传给未看过的人。最后一位未看牌的人必须相信或质疑。
9. 某玩家第三次受罚，爆料阶段结束。两张已有惩罚持续叠加执行；第三次不再抽新惩罚卡。
10. 美德展示在线下打牌，DM 在控台记录分数。
11. 进入礼物阶段后，所有人连自己的礼物也看不到。每轮随机安排六人顺序，依次执行两次偷窥、两次交换、两次翻转，共两轮。
12. 偷窥只对当前行动者显示结果；记录是当时的快照，不随后续礼物变化而更新。原小程序的微信分享额外偷窥不实现，保持每轮固定六次行动。
13. 十二次行动完成后，DM 揭晓全部礼物，再结算一次。双好 +15，双坏 -15，一好一坏不变。重复结算会被拒绝。
14. 进入航行后，DM 抽取六张事件，大家同步看图片。事件效果在线下执行，不自动修改船位或美德牌。
15. DM 记录航行得分，进入分手仪式。页面显示最低分队伍；并列按手册在线下处理。

## 刷新、断线和换人

- 刷新后通常会自动回到房间；未自动进入时，重新输入房间号。**使用原来的浏览器和浏览器资料**即可恢复原角色和 DM 身份。
- 不要清除浏览器站点数据，不要退出匿名身份，不要把无痕窗口关闭后当作可恢复身份。
- DM 临时离线：玩家按钮会暂停；DM 回到原浏览器、原房间后恢复处理。离线前已经提交的请求恢复后会处理，请勿重复提交。
- 此版没有第二位 DM 自动接管，也没有角色密码恢复。身份丢失或需要换人时，请新建房间；不要临时切换到公开数据库规则。
- DM 重置会清空分数和牌局，但保留角色座位。换一批人玩，请创建新房间。
- 测试结束后，如要清理旧房间，在 Firebase 数据库 Data / 数据 → `rooms` 中删除对应房间。删除前确认房间号；代码不会自动清理。

## 常见问题

| 现象 | 检查 |
| --- | --- |
| 网页404 | 等待 Pages 部署完成；确认 `index.html` 在根目录，地址有 `breakup-game-/` |
| 网站有首页，但无法创建房间 | 确认 config.js 已填写、匿名登录已启用、数据库URL正确、规则已发布 |
| `PERMISSION_DENIED` | 对照本包规则全文发布，确认六个人均已登录并选角；不要改成公开规则 |
| 匿名登录失败 | Authentication → Sign-in method → Anonymous 是否启用；域名是否添加 |
| 页面一直提示 DM 离线 | DM 使用原浏览器重新打开该房间，保持前台；检查设备时间是否正确 |
| 图片不显示 | 检查 `assets/` 和 `rule-images/` 都已上传，大小写和目录层级正确 |
| 同电脑无法模拟六人 | 普通标签页共享匿名身份；演示模式用角色下拉框，实战用六台设备或独立浏览器资料 |
| 礼物偷窥结果与现在不同 | 这是偷窥发生时的快照；后续交换／翻转会改变礼物，这是预期行为 |
| 更新代码后页面没变化 | 强制刷新或关闭再打开；本网站没有安装缓存 Service Worker |

## 验收与验证边界

已执行核心逻辑测试，覆盖发牌无重复、权限判断、私密投影、传牌限制、三次受罚结束、礼物两轮与一次性结算、请求重复处理、重置后旧请求、事件不重复，以及 Firebase 空数组/稀疏数组的处理。

浏览器单机演示已实际走通：开场→发牌→出牌→私下查看→传递→惩罚计分→两轮礼物12次行动→揭晓结算；已检查图片弹窗。

**未完成真实 Firebase 项目与六台设备联机验证，也未运行 Firebase 权限规则模拟器。** 填好你的配置后，开正式局前请实测：

1. 两人同时点同一角色，只能一人成功。
2. 每个人只看到自己的手牌；非DM没有控台且不能通过普通操作改分或重置。
3. 同时操作和重复点击不会重复抽牌、重复结算。
4. DM 断线后暂停，回到原浏览器后恢复。
5. 六台设备刷新后角色一致、公共分数一致，图片能正常加载。

有 Node.js 的情况下可在本目录运行 `npm test`。无需 `npm install`，网站本身也不需要构建。

## 技术与资料说明

- 静态 HTML/CSS/ES modules；Firebase Web SDK 10.14.1 从 Google CDN 加载。
- 整个操作在 DM 的房间事务内提交，私牌、公共状态、结果和请求移除同时更新，避免先读后写造成的覆盖。
- 玩家私牌与公共状态分开订阅；没有向普通玩家下发完整房间状态。
- 隐藏引擎状态以 JSON 字符串保存，避免 Realtime Database 将空数组/空对象省略后破坏牌局结构。
- 控台修正分数属于朋友局的主持裁定，房主有权管理本局，不提供对房主的防作弊保证。
- 原卡图片已裁成单卡，其中重复的小怪兽心声页只保留一份。爆料、惩罚和扩展礼物文字采用豆包版本。

Firebase 官方资料：
- 匿名登录：<https://firebase.google.com/docs/auth/web/anonymous-auth>
- 数据库规则：<https://firebase.google.com/docs/database/security>
- 数据事务：<https://firebase.google.com/docs/database/web/read-and-write>
