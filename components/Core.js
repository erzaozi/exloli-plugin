import Config from "./Config.js";
import storeComic from "../utils/store.js";
import getTransDb from "./translate.js";
import fetch from "node-fetch";
import cheerio from "cheerio";
import { HttpsProxyAgent } from "https-proxy-agent";
import { FormData } from "formdata-polyfill/esm.min.js";
import { timeToString, stringToTime } from "../utils/timer.js";

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
};

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
};

const BASE_EX_URL = 'https://exhentai.org/?';
const BASE_E_URL = 'https://e-hentai.org/?';

export default class ExClient {
    constructor(isEx) {
        this.isEx = !!isEx;
        this.headerWithoutCookie = {
            'Referer': 'https://exhentai.org/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };
    }

    get header() {
        const cookie = Config.getConfig().ex_account;
        if (this.isEx) {
            const cookieStr = Object.entries(cookie)
                .map(([k, v]) => `${k}=${v}`)
                .join(';');
            return { ...this.headerWithoutCookie, "Cookie": cookieStr };
        }
        return this.headerWithoutCookie;
    }

    /**
     * 计算分类参数
     * @param {object} category - 分类对象，key 为分类名，value 为布尔值
     * @returns {number} - 计算后的分类参数
     */
    calCats(category) {
        return 1023 - Object.keys(category).reduce((sum, key) => {
            return category[key] ? sum + (LABELS[key] || 0) : sum;
        }, 0);
    }

    /**
     * 处理请求参数
     * @param {object} param - 请求参数对象
     * @returns {string} - 处理后的 URL 或 FormData
     */
    handleParam(param) {
        const navigationParams = {
            next: param.next,
            last: param.last,
            prev: param.prev,
            first: param.first,
        };

        if (param.type in navigationParams) {
            return navigationParams[param.type];
        } else {
            const form = new FormData();
            const { category, search_param, f_srdd, isEx, max_pages } = Config.getConfig();
            const mergeParam = { category, search_param, f_srdd, isEx, max_pages, ...param };

            form.append('f_search', mergeParam.search_param.join(','));
            form.append('advsearch', 1);
            form.append('f_srdd', mergeParam.f_srdd);
            form.append('f_cats', this.calCats(mergeParam.category));
            form.append('f_spt', mergeParam.max_pages);

            const baseURL = mergeParam.isEx ? BASE_EX_URL : BASE_E_URL;
            return baseURL + new URLSearchParams(form).toString();
        }
    }

    /**
     * 获取代理配置
     * @private
     * @returns {HttpsProxyAgent | null} - 代理实例或 null
     */
    #getAgent() {
        const config = Config.getConfig().proxy;
        if (config.enable && config.host && config.port) {
            const proxy = `http://${config.host}:${config.port}`;
            return new HttpsProxyAgent(proxy);
        }
        return null;
    }

    /**
     * 请求页面数据
     * @param {string} url - 请求 URL
     * @returns {Promise<object>} - 包含漫画列表和导航信息的 Promise
     */
    async requestPage(url) {
        const agent = this.#getAgent();
        const response = await fetch(url, { headers: this.header, agent });
        const page = { comicList: [] };

        if (response.status === 200) {
            const body = await response.text();
            const $ = cheerio.load(body);
            const $comics = $('table.itg.gltc > tbody > tr:not(:first-child):not(:has(td.itd[colspan="4"]))');

            $comics.each((index, comic) => {
                const $comic = $(comic);

                try {
                    const link = $comic.find('td.gl3c.glname a').attr('href');
                    const id = link.match(/\/(\d+)\//)[1];
                    const $coverImg = $comic.find('td.gl2c img');
                    const cover = $coverImg.attr('data-src') || $coverImg.attr('src');
                    const title = $comic.find('td.gl3c.glname a div.glink').text();
                    const uploader = $comic.find('td.gl4c.glhide div a').text();
                    const pagesText = $comic.find('td.gl4c.glhide div:nth-child(2)').text();
                    const pages = Number(pagesText.replace(' pages', '')) || undefined;
                    const posted = $comic.find('div[id^="posted_"]').text();
                    const timestamp = stringToTime(posted);
                    const starStyle = $comic.find('div.ir').attr('style');
                    const starMatch = starStyle && starStyle.match(/background-position:([^;]+)/);
                    const star = starMatch ? (() => {
                        const [x, y] = starMatch[1].split(/\s+/);
                        const baseScore = y === "-21px" ? 4.5 : 5;
                        const offset = parseInt(x, 10) / 16;
                        return baseScore + offset;
                    })() : undefined;

                    page.comicList.push({ id, link, cover, title, uploader, pages, posted, timestamp, star });
                } catch (error) {
                    logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`跳过第 ${index + 1} 漫画`), logger.red(error));
                }
            });

            page.first = $('a#dfirst').attr('href');
            page.prev = $('a#dprev').attr('href');
            page.next = $('a#dnext').attr('href');
            page.last = $('a#dlast').attr('href');
        }

        return page;
    }

    /**
     * 过滤漫画列表
     * @param {Array<object>} comicList - 漫画列表
     * @returns {Array<object>} - 过滤后的漫画列表
     */
    comicsFilter(comicList) {
        const config = Config.getConfig();
        const filtedComicList = comicList.filter(comic => (
            comic.timestamp > stringToTime(config.last_time) &&
            (comic.pages !== undefined && comic.pages <= config.max_pages)
        ));

        if (comicList.length > 0) {
            config.last_time = timeToString(comicList[0].posted);
            Config.setConfig(config);
        }
        return filtedComicList;
    }

    /**
     * 请求漫画内容页面链接
     * @param {string} url - 漫画详情页 URL
     * @param {number} [index=1] - 页码
     * @returns {Promise<Array<string>>} - 包含图片页面链接的 Promise
     */
    async requestContent(url, index = 1) {
        const agent = this.#getAgent();
        const headers = this.header;
        const response = await fetch(`${url}/?p=${index}`, { headers, agent });
        const body = await response.text();
        const $ = cheerio.load(body);
        return $("#gdt a").map((i, el) => $(el).attr("href")).get();
    }

    /**
     * 获取漫画更多信息
     * @param {object} comic - 漫画对象
     * @returns {Promise<object|null>} - 包含更多信息的漫画对象或 null
     */
    async getMoreInfo(comic) {
        const agent = this.#getAgent();
        const headers = this.header;

        try {
            const response = await fetch(comic.link, { headers, agent });
            const body = await response.text();
            const $ = cheerio.load(body);
            const $comicInfo = $("div#gdd table tbody > tr");

            comic.language = $comicInfo.find("td.gdt1:contains('Language:') + td.gdt2").text();
            comic.favorite = $comicInfo.find("td.gdt1:contains('Favorited:') + td.gdt2").text();
            const ratingText = $("div#gdr table td#rating_label").text();
            const ratingMatch = ratingText.match(/Average:\s*([\d.]+)/);
            comic.star = ratingMatch ? parseFloat(ratingMatch[1]) : comic.star;

            const totalPages = Math.ceil(comic.pages / 20);
            const contentPromises = Array.from({ length: totalPages + 1 }, async (_, i) => await this.requestContent(comic.link, i));
            comic.content = (await Promise.all(contentPromises)).flat();

            comic.tags = {};
            const $tagList = $("div#taglist table tbody > tr");
            $tagList.each((index, element) => {
                const key = $(element).find('td.tc').text().slice(0, -1);
                const values = $(element).find('td > div > a').map((i, ele) => $(ele).text()).get();
                comic.tags[key] = values;
            });

            return comic;
        } catch (error) {
            logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`获取更多信息失败`), logger.red(error));
            return null;
        }
    }

    /**
     * 下载图片
     * @param {string} picturePage - 图片页面 URL
     * @param {number} [retry=3] - 重试次数
     * @param {number} index - 图片索引
     * @returns {Promise<Buffer|null>} - 图片 Buffer 或 null
     */
    async downloadPicture(picturePage, retry = 3, index) {
        const agent = this.#getAgent();
        const headers = this.header;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(picturePage, { headers, agent, signal: controller.signal });
            const body = await response.text();
            const $ = cheerio.load(body);
            const picUrl = $("img#img").attr("src");
            const picResponse = await fetch(picUrl);

            if (!picResponse.ok) {
                throw new Error(`Failed to fetch image: ${picResponse.status} ${picResponse.statusText}`);
            }

            logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`下载第 ${index} 张图片`), logger.green('完成'));
            return Buffer.from(await picResponse.arrayBuffer());
        } catch (error) {
            if (retry > 0) {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`下载第 ${index} 张图片失败，进行重试 (${retry} 次剩余)`), logger.red(error));
                return await this.downloadPicture(picturePage, retry - 1, index);
            } else {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`下载第 ${index} 张图片失败，已达到最大重试次数`), logger.red(error));
                return null;
            }
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * 请求漫画列表并下载
     * @param {Array<object>} oldComicList - 原始漫画列表
     * @returns {Promise<Array<object>>} - 处理后的漫画列表
     */
    async requestComics(oldComicList) {
        const agent = this.#getAgent();
        const headers = this.header;

        let comicsWithMoreInfo = (await Promise.allSettled(
            oldComicList.map(comic => this.getMoreInfo(comic))
        )).map(result => result.value).filter(Boolean);

        comicsWithMoreInfo = await this.comicTranslator(comicsWithMoreInfo);

        for (const comic of comicsWithMoreInfo) {
            const { coverSaver, generatePDF } = storeComic(comic);

            try {
                const coverResponse = await fetch(comic.cover, { headers, agent });
                if (!coverResponse.ok) {
                    logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`封面下载失败`), logger.red(coverResponse.status, coverResponse.statusText));
                } else {
                    const buffer = await coverResponse.arrayBuffer().then(buffer => Buffer.from(buffer));
                    await coverSaver(buffer);
                }
            } catch (error) {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`封面下载失败`), logger.red(error));
            }

            const batchSize = 4;
            const picList = [];
            for (let i = 0; i < comic.content.length; i += batchSize) {
                const batch = comic.content.slice(i, i + batchSize);
                const promises = batch.map(async (content, index) => {
                    const originalIndex = i + index;
                    const pic = await this.downloadPicture(content, 3, originalIndex + 1);
                    return pic;
                });
                const results = await Promise.all(promises);
                picList.push(...results.filter(Boolean));
            }
            comic.PDFfile = await generatePDF(picList);
        }
        return comicsWithMoreInfo;
    }

    /**
     * 翻译漫画标签
     * @param {Array<object>} comicList - 漫画列表
     * @returns {Promise<Array<object>>} - 翻译后的漫画列表
     */
    async comicTranslator(comicList) {
        const db = await getTransDb();
        const translator = (comic) => {
            const translatedTags = {};
            for (const tag in comic.tags) {
                const category = db.data.find(cat => cat.namespace === tag);
                if (category) {
                    translatedTags[category.frontMatters.name] = comic.tags[tag].map(label => {
                        return category.data[label]?.name || label;
                    });
                } else {
                    translatedTags[tag] = comic.tags[tag];
                }
            }
            comic.tags = translatedTags;
            return comic;
        };
        return comicList.map(translator);
    }
}