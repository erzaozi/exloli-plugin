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
                reg: '^我已阅读并同意插件使用须知$',
                fnc: 'agreeProtocol',
                permission: "master"
            }]
        })
    }

    async checkProtocol(e) {
        let isAgree = await redis.get(`Yz:exloli-security`)
        if (isAgree) return false
        await e.reply("您还未阅读并同意插件使用须知，请阅读本项目README后根据指引操作")
        return true
    }

    async agreeProtocol(e) {
        await redis.set(`Yz:exloli-security`, "1")
        await e.reply("您已同意插件使用须知，您已可以使用本插件的所有功能")
        return true
    }
}
