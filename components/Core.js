import Config from "./Config.js"
import getTransDb from "./translate.js"
import fetch from "node-fetch"
import cheerio from "cheerio"
import { HttpsProxyAgent } from "https-proxy-agent"
import { FormData } from "formdata-polyfill/esm.min.js"
import { timeToString, stringToTime } from "../utils/timer.js"

const labels = {
    'Doujinshi': 2,
    'Manga': 4,
    'Artist CG': 8,
    'Game CG': 16,
    'Western': 512,
    'Non-H': 256,
    'Image Set': 32,
    'Cosplay': 64,
    'Asian Porn': 128,
    'Misc': 1
}

const BASE_EX_URL = 'https://exhentai.org/?'
const BASE_E_URL = 'https://e-hentai.org/?'

export default new class ExClient {
    constructor() {
        let cookie = {
            sl: 'dm_2',
            ...Config.getConfig().ex_account
        }
        const cookieStr = Object.entries(cookie).map(([k, v]) => `${k}=${v}`).join(';')
        this.header = {
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Connection': 'keep-alive',
            'Referer': 'https://exhentai.org/',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'same-site',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Cookie': cookieStr
        }
    }

    calCats(category) {
        let number = 0
        for (let label in category) {
            if (!category[label]) {
                number += labels[label]
            }
        }
        return number
    }

    parseParam(param) {
        if (param.type === 'next') {
            return param.next
        } else if (param.type === 'last') {
            return param.last
        } else if (param.type === 'prev') {
            return param.prev
        } else if (param.type === 'first') {
            return param.first
        } else {
            let form = new FormData()
            const { category, search_param, f_srdd } = Config.getConfig()
            form.append('f_search', search_param.join(','))
            form.append('advsearch', 1)
            form.append('f_srdd', f_srdd)
            form.append('f_cats', this.calCats(category))
            return (Config.getConfig().isEx ? BASE_EX_URL : BASE_E_URL) + new URLSearchParams(form).toString()
        }
    }

    async requestPage(url) {
        let agent = null;
        if (Config.getConfig().proxy.enable) {
            let proxy = 'http://' + Config.getConfig().proxy.host + ':' + Config.getConfig().proxy.port
            agent = new HttpsProxyAgent(proxy)
        }
        const response = await fetch(url, { headers: this.header, agent })
        let page = { comicList: [] }
        if (response.status === 200) {
            const body = await response.text()
            const $ = cheerio.load(body)
            const comics = $('table.itg.gltc').children('tbody').children('tr')
            comics.each((index, comic) => {
                const $comic = $(comic)
                const link = $comic.find('td.gl3c.glname a').attr('href')
                const cover = $comic.find('td.gl2c img').attr('src')
                const title = $comic.find('td.gl3c.glname a div.glink').text()
                const uploader = $comic.find('td.gl4c.glhide div a').text()
                const pages = $comic.find('td.gl4c.glhide div a').parent().next().text()
                const posted = $comic.find('td.gl2c').eq(1).text()
                const timestamp = stringToTime(posted)
                page.comicList.push({ link, cover, title, uploader, pages, posted, timestamp })
            })
            const first = $('a#dfirst').attr('href')
            const prev = $('a#dprev').attr('href')
            const next = $('a#dnext').attr('href')
            const last = $('a#dlast').attr('href')
            page = { ...page, first, prev, next, last }
        }
        return page
    }

    comicsFilter(comicList) {
        const config = Config.getConfig()
        logger.warn(comicList)
        const filtedComicList = comicList.filter(comic => (comic.timestamp > stringToTime(config.last_time)) && (comic.pages && comic.pages < config.max_pages))
        config.last_time = timeToString(new Date().getTime())
        Config.setConfig(config)
        return filtedComicList
    }

    comicTranslater(comics) {
        const db = getTransDb()
        function translator(comic) {

        }
        if (Array.isArray(comics)) {
            return comics.map((comic) => translator(comic))
        } else {
            return translator(comics)
        }
    }

    requestComic(url) {

    }
}