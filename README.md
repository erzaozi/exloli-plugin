![exloli-plugin](https://socialify.git.ci/erzaozi/exloli-plugin/image?description=1&font=Raleway&forks=1&issues=1&language=1&name=1&owner=1&pattern=Circuit%20Board&pulls=1&stargazers=1&theme=Auto)

# ExLOLI-PLUGIN 🍑

<img decoding="async" align=right src="resources/readme/girl.png" width="35%">

- 一个基于 [Yunzai 系列机器人框架](https://github.com/yhArcadia/Yunzai-Bot-plugins-index) 的萝莉本子推送插件，从E站里站实时同步更新并下载漫画并上传发送到任何地方

- 采用前后端分离架构服务端自动同步更新，无需配置里站账号，无需访问里站网络要求，只需填写数据库Token

- **使用中遇到问题请加QQ群咨询：[707331865](https://qm.qq.com/q/TXTIS9KhO2)**

> [!TIP]
> 考虑到开发团队账号风险，该项目是该账号下首发的开源项目，后端数据库更新与上传为 [CikeyQi](https://github.com/CikeyQi) 与作者共同开发，此外她还承担了本插件端大部分功能实现，并由本人完善了一部分小功能。

## 安装插件

> [!CAUTION]
> 欢迎使用ExLOLI-PLUGIN，在您开始使用之前，请仔细阅读以下重要信息：
> - 年龄限制：本插件仅供年满18岁（或您所在国家/地区的法定成年年龄）的用户使用。使用本软件即表示您确认自己符合这一年龄要求。
> - 遵守当地法律：用户必须遵守自己所在国家或地区的所有法律和规定。请注意，在某些国家和地区（例如中国），使用或访问本插件中的内容可能是非法的。用户有责任确保自己的行为符合当地法律。
> - 免责声明：本插件的开发者不对用户如何使用本软件承担任何法律责任。用户需对使用本插件可能产生的任何法律后果负责。
> - 确认同意：在使用本插件之前，请确认您已阅读、理解并同意遵守以上所有条款。
> - 隐私和安全：本插件尊重并保护所有用户的隐私和安全。有关数据收集和处理的详细信息，请参阅我们的隐私政策。
谢谢您选择使用ExLOLI-PLUGIN。我们希望您安全、负责任地享受我们的产品。
#### 1. 克隆仓库

```
git clone https://github.com/erzaozi/exloli-plugin.git ./plugins/exloli-plugin
```

> [!NOTE]
> 如果你的网络环境较差，无法连接到Github，可以使用 [GitHub Proxy](https://mirror.ghproxy.com/) 提供的文件代理加速下载服务
> ```
> git clone https://mirror.ghproxy.com/https://github.com/erzaozi/exloli-plugin.git ./plugins/exloli-plugin
> ```

#### 2. 安装依赖

```
pnpm install --filter=exloli-plugin
```

## 插件配置

<details> <summary>如何获取Token</summary>

  - 本插件功能是不符合中国大陆规定的，我们非常不建议你在国内平台使用，你可以使用 [TRSS-Yunzai](https://github.com/TimeRainStarSky/Yunzai) 将其使用在 `Discord` 等国外平台

  - 安装好插件后，请向群 **[707331865](https://qm.qq.com/q/TXTIS9KhO2)** 内的管理员 **二喵子** 获取数据库Token，我们不会为Token索取任何费用

</details>

<details> <summary>Token如何使用</summary>

  - 使用 `#exloli设置token` 填入数据库Token后，首次使用必须发送 `#exloli克隆` 将数据库更新同步到本地

  - 在你想开启推送的群或私聊发送 `#exloli开启推送` 即可开启推送，使用 `#exloli关闭推送` 即可关闭推送

  - 你可以使用 `#exloli推送` 测试推送是否正常，使用该命令将会立即向设置好的群和私聊推送一个本子

</details>

## 功能列表

请使用 `#exloli帮助` 获取完整帮助

- [x] 实时推送更新
- [x] 推送本子内容
- [x] 获取历史本子

## 常见问题
1. 为什么我使用推送命令后没有收到推送？
   + 发送推送仅推送至所有开启了推送配置的群以及私聊。
   + 日志中会即刻显示推送完成，本子内容将陆续推送至指定群聊。
2. 为什么我配置过了推送，之前能推送现在不能？
   + 在更换了机器人账号后需要再次配置。

## 支持与贡献

如果你喜欢这个项目，请不妨点个 Star🌟，这是对开发者最大的动力， 当然，你可以对我 [爱发电](https://afdian.net/a/sumoqi) 赞助，呜咪~❤️

有意见或者建议也欢迎提交 [Issues](https://github.com/erzaozi/exloli-plugin/issues) 和 [Pull requests](https://github.com/erzaozi/exloli-plugin/pulls)。

## 许可证
本项目使用 [GNU AGPLv3](https://choosealicense.com/licenses/agpl-3.0/) 作为开源许可证。