import fs from 'fs'
import { pluginResources } from "../model/path.js"
import { promisify } from 'util'
import { Stream } from 'stream'

export default function storeComic(comic) {
    if (!fs.existsSync(`${pluginResources}/comics/${comic.dirName}`)) {
        fs.mkdirSync(`${pluginResources}/comics/${comic.dirName}`, { recursive: true })
    }
    fs.writeFileSync(`${pluginResources}/comics/${comic.dirName}/info.json`, JSON.stringify({
        title: comic.title || "未知",
        cover: comic.cover || "未知",
        language: comic.language || "未知",
        uploader: comic.uploader || "未知",
        pages: comic.pages || "未知",
        posted: comic.posted || "未知",
        favorite: comic.favorite || "未知",
        link: comic.link || "未知",
        tags: comic.tags
    }))
    return async (pic, index) => {
        const pipeline = promisify(Stream.pipeline)
        await pipeline(pic, fs.createWriteStream(`${pluginResources}/comics/${comic.dirName}/${index}.png`))
    }
}

export function deleteComic(comic) {
    if (fs.existsSync(`${pluginResources}/comics/${comic.dirName}`)) {
        fs.rm(`${pluginResources}/comics/${comic.dirName}`, { recursive: true }, (err) => {
            if (err) {
                logger.error(`删除漫画出错: ${err}`);
            } else {
                logger.info(`成功删除漫画: ${comic.dirName}`);
            }
        })
    }
} 