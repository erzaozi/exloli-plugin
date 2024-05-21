import plugin from '../../../lib/plugins/plugin.js'

export class Security extends plugin {
    constructor() {
        super({
            name: 'ExLOLI-安全验证',
            dsc: 'ExLOLI 安全验证',
            event: 'message',
            priority: -Infinity,
            rule: [{
                reg: '^#?exloli.*$',
                fnc: 'checkProtocol'
            }, {
                reg: '^我同意Exloli-Plugin《插件使用须知》$',
                fnc: 'agreeProtocol',
                permission: "master"
            }]
        })
    }

    async checkProtocol(e) {
        let isAgree = await redis.get(`Yz:exloli-security`)
        if (isAgree) return false
        await e.reply("您还未阅读并同意《插件使用须知》，如果您在国内平台使用可能会违法！请熟读我们的《插件使用须知》")
        return true
    }

    async agreeProtocol(e) {
        await redis.set(`Yz:exloli-security`, "1")
        await e.reply("谢谢您选择使用 ExLOLI-PLUGIN。我们希望您安全、负责任地享受我们的产品。")
        return true
    }
}
