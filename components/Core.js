import Config from "./Config.js"
import storeComic from "../utils/store.js"
import getTransDb from "./translate.js"
import fetch from "node-fetch"
import cheerio from "cheerio"
import { HttpsProxyAgent } from "https-proxy-agent"
import { FormData } from "formdata-polyfill/esm.min.js"
import { timeToString, stringToTime } from "../utils/timer.js"

export const LABELS = {
    'Doujinshi': 2,
    'Manga': 4,
    'ArtistCG': 8,
    'GameCG': 16,
    'Western': 512,
    'NonH': 256,
    'ImageSet': 32,
    'Cosplay': 64,
    'AsianPorn': 128,
    'Misc': 1
}

export const CATEGORY = {
    1: "Doujinshi",
    2: "Manga",
    3: "ArtistCG",
    4: "GameCG",
    5: "Western",
    6: "NonH",
    7: "ImageSet",
    8: "Cosplay",
    9: "AsianPorn",
    10: "Misc",
}

const BASE_EX_URL = 'https://exhentai.org/?'
const BASE_E_URL = 'https://e-hentai.org/?'

export default class ExClient {
    constructor(isEx) {
        this.isEx = !!isEx
        this.headerWithoutCookie = {
            'Referer': 'https://exhentai.org/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
    }

    get header() {
        const cookie = Config.getConfig().ex_account
        if (this.isEx) {
            const cookieStr = Object.entries(cookie).map(([k, v]) => `${k}=${v}`).join(';')
            return { ...this.headerWithoutCookie, "Cookie": cookieStr }
        } else return this.headerWithoutCookie
    }

    calCats(category) {
        let number = 0
        for (let index of category) {
            number += LABELS[index]
        }
        return 1023 - number
    }

    handleParam(param) {
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
            const { category, search_param, f_srdd, isEx, max_pages } = Config.getConfig()
            const mergeParam = { category, search_param, f_srdd, isEx, max_pages, ...param }
            form.append('f_search', mergeParam.search_param.join(','))
            form.append('advsearch', 1)
            form.append('f_srdd', mergeParam.f_srdd)
            form.append('f_cats', this.calCats(mergeParam.category))
            form.append('f_spt', mergeParam.max_pages)

            return (mergeParam.isEx ? BASE_EX_URL : BASE_E_URL) + new URLSearchParams(form).toString()
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
                    const id = link.match(/\/(\d+)\//)[1]
                    const cover = $comic.find('td.gl2c img').attr('src')
                    const title = $comic.find('td.gl3c.glname a div.glink').text()
                    const uploader = $comic.find('td.gl4c.glhide div a').text()
                    const pages = Number($comic.find('td.gl4c.glhide div:nth-child(2)').text().replace(' pages', ''))
                    const posted = $comic.find('div[id^="posted_"]').text()
                    const timestamp = stringToTime(posted)
                    const star = (() => {
                        const style = $comic.find('div.ir').attr('style');
                        const [x, y] = style.match(/background-position:([^;]+)/)[1].split(/\s+/);

                        const baseScore = y === "-21px" ? 4.5 : 5;
                        const offset = parseInt(x, 10) / 16;

                        return baseScore + offset;
                    })()
                    page.comicList.push({ id, link, cover, title, uploader, pages, posted, timestamp, star })
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
        const filtedComicList = comicList.filter(comic => (comic.timestamp > stringToTime(config.last_time)) && (comic.pages && comic.pages <= config.max_pages))
        if (comicList.length > 0) {
            config.last_time = timeToString(comicList[0].posted)
            Config.setConfig(config)
        }
        return filtedComicList
    }

    async requestContent(url, index = 1) {
        let agent = null
        const config = Config.getConfig()
        if (config.proxy.enable) {
            let proxy = 'http://' + config.proxy.host + ':' + config.proxy.port
            agent = new HttpsProxyAgent(proxy)
        }
        const headers = this.header

        const response = await fetch(url + `/?p=${index}`, { headers, agent })
        const body = await response.text()
        const $ = cheerio.load(body)

        return $("#gdt a").map((i, el) => $(el).attr("href")).get()
    }

    async getMoreInfo(comic) {
        let agent = null
        const config = Config.getConfig()
        if (config.proxy.enable) {
            let proxy = 'http://' + config.proxy.host + ':' + config.proxy.port
            agent = new HttpsProxyAgent(proxy)
        }
        try {
            const headers = this.header
            const response = await fetch(comic.link, { headers, agent })
            const body = await response.text()
            const $ = cheerio.load(body)
            const $comic = $("div#gdd table tbody").children("tr")
            comic.language = $comic.find("td.gdt1").filter((index, element) => $(element).text() === "Language:").next().text()
            comic.favorite = $comic.find("td.gdt1").filter((index, element) => $(element).text() === "Favorited:").next().text()
            comic.star = parseFloat($("div#gdr table td#rating_label").text().replace("Average:", ""))
            comic.content = $("#gdt a").map((i, el) => $(el).attr("href")).get()
            for (let i = 1; i < Math.ceil(comic.pages / 20); i++) {
                comic.content = await comic.content.concat(await this.requestContent(comic.link, i))
            }
            comic.tags = {}
            const $tagList = $("div#taglist table tbody").children("tr")
            $tagList.each((index, element) => {
                let key = $(element).find('td.tc').text().slice(0, -1)
                let values = $(element).find('td>div>a').map((i, ele) => $(ele).text()).get()
                comic.tags[key] = values
            })
            return comic
        } catch (err) {
            logger.error(err)
            return null
        }
    }

    // 用于获取下载图片的重试
    async downloadPicture(picturePage, retry = 3, index) {
        let agent = null
        const config = Config.getConfig()
        if (config.proxy.enable) {
            let proxy = 'http://' + config.proxy.host + ':' + config.proxy.port
            agent = new HttpsProxyAgent(proxy)
        }

        const headers = this.header
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10秒超时
        try {
            const response = await fetch(picturePage, { headers, agent, signal: controller.signal })
            clearTimeout(timeout)
            const body = await response.text()
            const $ = cheerio.load(body)
            const picUrl = $("img#img").attr("src")
            const pic = await fetch(picUrl)
            if (!pic.ok) {
                throw new Error()
            }
            logger.mark(`[Exloli-Plugin]下载第 ${index} 张图片完成`)
            return Buffer.from(await pic.arrayBuffer())
        } catch (error) {
            clearTimeout(timeout)
            logger.error(`[Exloli-Plugin]下载第 ${index} 张图片失败，还剩余${--retry}次重试`)
            if (retry > 0) {
                return await this.downloadPicture(picturePage, retry, index)
            } else return null
        }
    }

    async requestComics(oldComicList) {
        let agent = null
        const config = Config.getConfig()
        if (config.proxy.enable) {
            let proxy = 'http://' + config.proxy.host + ':' + config.proxy.port
            agent = new HttpsProxyAgent(proxy)
        }
        const headers = this.header

        let comicsWithMoreInfo = (await Promise.allSettled(oldComicList.map(async (comic) => await this.getMoreInfo(comic)))).map(ele => ele.value)

        comicsWithMoreInfo = await this.comicTranslator(comicsWithMoreInfo)

        for (let comic of comicsWithMoreInfo) {
            let { comicSaver, coverSaver, generatePDF } = storeComic(comic)

            const pic = await fetch(comic.cover, { headers, agent })
            if (!pic.ok) {
                logger.error("[Exloli-Plugin] 封面下载失败")
            } else {
                try {
                    await coverSaver(pic.body)
                } catch (err) {
                    logger.error("[Exloli-Plugin] 封面下载失败")
                }
            }

            const batchSize = 4
            let picList = []
            for (let i = 0; i < comic.content.length; i += batchSize) {
                // 获取当前批次的图片索引
                const batch = comic.content.slice(i, i + batchSize)

                // 创建并行下载的Promise数组
                const promises = batch.map(async (content, index) => {
                    const originalIndex = i + index;  // 计算原始索引
                    const pic = await this.downloadPicture(content, 3, originalIndex + 1)
                    try {
                        originalIndex === 0 ? await comicSaver(pic, 0) : null
                    } catch (err) { }
                    return pic || null
                })

                // 等待当前批次的所有下载完成
                const res = await Promise.all(promises)
                picList = picList.concat(res)
            }
            comic.PDFfile = await generatePDF(picList)
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