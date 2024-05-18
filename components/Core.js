import Config from "./Config.js"
import storeComic from "../utils/store.js"
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
            const $comics = $('table.itg.gltc').children('tbody').children('tr')
            $comics.each((index, comic) => {
                if (index > 0) {
                    const $comic = $(comic)
                    const link = $comic.find('td.gl3c.glname a').attr('href')
                    const cover = $comic.find('td.gl2c img').attr('src')
                    const title = $comic.find('td.gl3c.glname a div.glink').text()
                    const uploader = $comic.find('td.gl4c.glhide div a').text()
                    const pages = Number($comic.find('td.gl4c.glhide div a').parent().next().text().slice(0, -5))
                    const posted = $comic.find('div[id^="posted_"]').text()
                    const timestamp = stringToTime(posted)
                    page.comicList.push({ link, cover, title, uploader, pages, posted, timestamp })
                }
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
        const filtedComicList = comicList.filter(comic => (comic.timestamp > stringToTime(config.last_time) - 14400000) && (comic.pages && comic.pages < config.max_pages))
        config.last_time = timeToString(new Date().getTime())
        Config.setConfig(config)
        return filtedComicList
    }

    async requestComics(oldComicList) {
        let agent = null
        if (Config.getConfig().proxy.enable) {
            let proxy = 'http://' + Config.getConfig().proxy.host + ':' + Config.getConfig().proxy.port
            agent = new HttpsProxyAgent(proxy)
        }
        const headers = this.header
        async function getMoreInfo(comic) {
            const response = await fetch(comic.link, { headers, agent })
            const body = await response.text()
            const $ = cheerio.load(body)
            const $comic = $("div#gdd table").children("tbody").children("tr")
            comic.language = $comic.find("td.gdt1").filter((index, element) => $(element).text() === "Language:").next().text()
            comic.favorite = $comic.find("td.gdt1").filter((index, element) => $(element).text() === "Favorited:").next().text()
            comic.firstPage = $("div#gdt div.gdtm div a").attr("href")
            comic.tags = {}
            const $tagList = $("div#taglist table").children("tbody").children("tr")
            $tagList.each((index, element) => {
                let key = $(element).find('td.tc').text().slice(0, -1)
                let values = $(element).find('td>div>a').map((i, ele) => $(ele).text()).get()
                comic.tags[key] = values
            })
            return comic
        }
        async function downloadPicture(picturePage, picSaverOnce, retry = 5) {
            const response = await fetch(picturePage, { headers, agent })
            const body = await response.text()
            const $ = cheerio.load(body)
            const picUrl = $("img#img").attr("src")
            const nextPage = $("a#next").attr("href")
            try {
                const pic = await fetch(picUrl)
                if (!pic.ok) {
                    throw new Error()
                }
                picSaverOnce(pic.body)
                return nextPage
            } catch (error) {
                logger.error(`[Exloli-Plugin]下载图片失败，还剩余${retry--}次重试`)
                logger.error(error)
                if (retry > 0) {
                    return downloadPicture(picturePage, picSaverOnce, retry)
                } else return nextPage
            }
        }
        let comicsWithMoreInfo = (await Promise.allSettled(oldComicList.map(async (comic) => await getMoreInfo(comic)))).map(ele => ele.value)
        logger.warn(comicsWithMoreInfo)
        comicsWithMoreInfo = await this.comicTranslator(comicsWithMoreInfo)
        for (let comic of comicsWithMoreInfo) {
            comic.dirName = comic.title.replace(/[<>:"/\\|?*]+/g, '')
            let picSaver = storeComic(comic)
            let index = 0
            let nextPage, currentPage
            nextPage = currentPage = comic.firstPage
            do {
                currentPage = nextPage
                const picSaverOnce = async (pic) => await picSaver(pic, index)
                nextPage = await downloadPicture(nextPage, picSaverOnce)
                index++
            } while (nextPage !== currentPage)
        }
        return comicsWithMoreInfo
    }

    async comicTranslator(comicList) {
        const db = await getTransDb()
        function translator(comic) {
            let translatedTags = {}
            for (let tag in comic.tags) {
                let category = db.data.find(category => category.namespace === tag)
                translatedTags[category.frontMatters.name] = []
                comic.tags[tag].map(label => {
                    translatedTags[category.frontMatters.name].push(category.data[label]?.name || label)
                })
            }
            comic.tags = translatedTags
            return comic
        }
        return comicList.map(comic => translator(comic))
    }
}