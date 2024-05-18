import fs from 'fs'
import { pluginResources } from "../model/path.js"
import { promisify } from 'util'
import { Stream } from 'stream'

export default function storeComic(comic) {
    if (!fs.existsSync(`${pluginResources}/comics/${comic.dirName}`)) {
        fs.mkdirSync(`${pluginResources}/comics/${comic.dirName}`, { recursive: true })
    }
    fs.writeFileSync(`${pluginResources}/comics/${comic.dirName}/info.txt`, JSON.stringify({
        "标题": comic.title || "未知",
        "封面": comic.cover || "未知",
        "语言": comic.language || "未知",
        "上传者": comic.uploader || "未知",
        "页数": comic.pages || "未知",
        "上传时间": comic.posted || "未知",
        "点赞数": comic.favorite || "未知",
        "链接": comic.link || "未知",
        "标签": comic.tags || "未知"
    }))
    return async (pic, index) => {
        const pipeline = promisify(Stream.pipeline)
        await pipeline(pic, fs.createWriteStream(`${pluginResources}/comics/${comic.dirName}/${index}.png`))
    }
}

export function deleteComic(comic) {
    if (fs.existsSync(`${pluginResources}/comics/${comic.dirName}`)) {
        fs.rm(`${pluginResources}/comics/${comic.dirName}`, { recursive: true })
    }
} 