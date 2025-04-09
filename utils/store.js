import fs from 'fs'
import { pluginResources } from "../model/path.js"
import { promisify } from 'util'
import { Stream } from 'stream'
import { PDFDocument } from '@cantoo/pdf-lib'
import sharp from 'sharp'
import Config from '../components/Config.js'

export default function storeComic(comic) {
    if (!fs.existsSync(`${pluginResources}/comics/${comic.id}`)) {
        fs.mkdirSync(`${pluginResources}/comics/${comic.id}`, { recursive: true })
    }
    fs.writeFileSync(`${pluginResources}/comics/${comic.id}/info.json`, JSON.stringify({
        id: comic.id,
        title: comic.title || "未知",
        star: comic.star,
        language: comic.language || "未知",
        uploader: comic.uploader || "未知",
        pages: comic.pages || "未知",
        posted: comic.posted || "未知",
        favorite: comic.favorite || "未知",
        link: comic.link || "未知",
        tags: comic.tags,
        content: comic.content,
        cover: comic.cover,
        PDFfile: `${pluginResources}/comics/${comic.id}/${comic.id}.pdf`
    }))
    return {
        comicSaver: async (pic, index) => {
            const pipeline = promisify(Stream.pipeline)
            const writer = fs.createWriteStream(`${pluginResources}/comics/${comic.id}/${index}.webp`)
            try {
                await pipeline(pic, writer)
            } catch (error) {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`保存漫画图片第 ${index} 张失败`), logger.red(error));
            } finally {
                writer.end()
            }
        },
        coverSaver: async (pic) => {
            const pipeline = promisify(Stream.pipeline)
            const writer = fs.createWriteStream(`${pluginResources}/comics/${comic.id}/cover.png`)
            try {
                await pipeline(pic, writer)
            } catch (error) {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`保存封面图片失败`), logger.red(error));
            } finally {
                writer.end()
            }
        },
        generatePDF: async (picList) => {
            const pdfDoc = await PDFDocument.create()

            const jpegBuffers = await Promise.all(
                picList.map(async pic => {
                    if (pic) {
                        try {
                            return await sharp(Buffer.from(pic)).jpeg().toBuffer()
                        } catch (err) {
                            return await sharp(`${pluginResources}/failed.jpg`).jpeg().toBuffer()
                        }
                    } else return await sharp(`${pluginResources}/failed.jpg`).jpeg().toBuffer()
                })
            )

            await Promise.all(
                jpegBuffers.map(async jpeg => {
                    const image = await pdfDoc.embedJpg(jpeg)
                    const page = pdfDoc.addPage([image.width, image.height])
                    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
                })
            )

            pdfDoc.encrypt({
                userPassword: comic.id,
                ownerPassword: Config.getConfig().password,
                permissions: { modifying: true },
            })
            const pdfBytes = await pdfDoc.save()

            fs.writeFileSync(`${pluginResources}/comics/${comic.id}/${comic.id}.pdf`, pdfBytes)
            for (let i = 1; i < comic.content.length; i++) {
                try {
                    fs.rmSync(`${pluginResources}/comics/${comic.id}/${i}.webp`)
                } catch (_) { }
            }

            return `${pluginResources}/comics/${comic.id}/${comic.id}.pdf`
        }
    }
}

export function deleteComic(comic) {
    if (fs.existsSync(`${pluginResources}/comics/${comic.id}`)) {
        fs.rm(`${pluginResources}/comics/${comic.id}`, { recursive: true }, (error) => {
            if (error) {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`删除漫画出错`), logger.red(error));
            } else {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`成功删除漫画`), logger.green(comic.id));
            }
        })
    }
} 