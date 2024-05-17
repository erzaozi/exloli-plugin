import _ from 'lodash'
import ExClient from '../components/Core.js'
import plugin from '../../../lib/plugins/plugin.js'


export class Push extends plugin {
    constructor() {
        super({
            name: 'ExLOLI-推送',
            dsc: 'ExLOLI 推送',
            event: 'message',
            priority: 1009,
            rule: [{
                reg: '^#?exloli推送$',
                fnc: 'push'
            }]
        });
        // this.task = {
        //     name: '[Exloli-Plugin]自动推送',
        //     fnc: () => this.push({ isTask: true }),
        //     cron: '*/1 * * * *',
        //     log: true
        // }

    }

    async push(e) {
        if (!e.isTask && !e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！');
            return true;
        }
        let page = await ExClient.requestPage(ExClient.parseParam({}))
        page.comicList = ExClient.comicsFilter(page.comicList)
        logger.warn(page.comicList)
        if (e.isTask) {

        }
        else {

        }
        
        //翻译
        //推送
        return
        const reg = e.msg.match(/推送([1-9][0-9]*)/)
        const seqNumber = reg ? reg[1] : 1
        let pushConfig = Config.getConfig().push_list;
        let currentComicList = Config.getComicList();
        let pushComic = currentComicList[seqNumber - 1];
        await pushComics([pushComic], pushConfig);
        logger.info('已推送：' + pushComic.title);
    }
}
