import fs from 'fs';
import path from 'path';
import { pluginResources } from "../model/path.js";
import fetch from 'node-fetch';
import { PDFDocument } from '@cantoo/pdf-lib';
import sharp from 'sharp';
import Config from '../components/Config.js';

const failedImagePath = path.join(pluginResources, 'failed.jpg');

export default function storeComic(comic) {
    const comicDir = path.join(pluginResources, 'comics', comic.id.toString());
    if (!fs.existsSync(comicDir)) {
        fs.mkdirSync(comicDir, { recursive: true });
    }
    const infoFilePath = path.join(comicDir, 'info.json');
    fs.writeFileSync(infoFilePath, JSON.stringify({
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
        cover: `cover.webp`,
        PDFfile: `${comic.id}.pdf`
    }, null, 2));

    return {
        comicSaver: async (buffer, index) => {
            const filePath = path.join(comicDir, `${index}.webp`);
            try {
                await fs.writeFileSync(filePath, buffer);
            } catch (error) {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`保存漫画图片第 ${index + 1} 张失败`), logger.red(error));
            }
        },
        coverSaver: async (buffer) => {
            const filePath = path.join(comicDir, 'cover.webp');
            try {
                await fs.writeFileSync(filePath, buffer);
            } catch (error) {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`保存封面图片失败`), logger.red(error));
            }
        },
        generatePDF: async (picList) => {
            const pdfDoc = await PDFDocument.create();

            const jpegBuffers = await Promise.all(
                picList.map(async pic => {
                    if (pic) {
                        try {
                            return await sharp(Buffer.from(pic)).jpeg().toBuffer();
                        } catch (error) {
                            logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`转换图片到 JPEG 失败`), logger.red(error));
                            return await sharp(failedImagePath).jpeg().toBuffer();
                        }
                    } else {
                        return await sharp(failedImagePath).jpeg().toBuffer();
                    }
                })
            );

            await Promise.all(
                jpegBuffers.map(async jpeg => {
                    const image = await pdfDoc.embedJpg(jpeg);
                    const page = pdfDoc.addPage([image.width, image.height]);
                    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
                })
            );

            pdfDoc.encrypt({
                userPassword: comic.id.toString(),
                ownerPassword: Config.getConfig().password,
                permissions: { modifying: true },
            });
            const pdfBytes = await pdfDoc.save();

            const pdfFilePath = path.join(comicDir, `${comic.id}.pdf`);
            fs.writeFileSync(pdfFilePath, pdfBytes);

            for (let i = 0; i < comic.content.length; i++) {
                const webpFilePath = path.join(comicDir, `${i}.webp`);
                try {
                    fs.rmSync(webpFilePath);
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`删除 WebP 图片失败`), logger.red(error));
                    }
                }
            }

            return pdfFilePath;
        }
    };
}

export function deleteComic(comic) {
    const comicDir = path.join(pluginResources, 'comics', comic.id.toString());
    if (fs.existsSync(comicDir)) {
        fs.rm(comicDir, { recursive: true }, (error) => {
            if (error) {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`删除漫画出错`), logger.red(error));
            } else {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`成功删除漫画`), logger.green(comic.id));
            }
        });
    }
}