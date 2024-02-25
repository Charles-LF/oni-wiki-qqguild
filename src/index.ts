import { Context, Schema } from "koishi";
import puppeteer from "koishi-plugin-puppeteer";
import os from "os";
import fs from "fs";
import * as lib from "./lib";

export const name = "oni-wiki-qqguild";

export const inject = ["puppeteer"];

export const usage = `更新日志：
  - 0.0.1 初始化
`;

export interface Config {
  botId: string;
  token: string;
  mdId: string;
  keyboardId: string;
  api: string;
  imgPath: string;
  publicUrl: string;
}

export const Config: Schema<Config> = Schema.object({
  botId: Schema.string().description("机器人ID"),
  token: Schema.string().description("机器人Token"),
  mdId: Schema.string().description("模板ID"),
  api: Schema.string()
    .description("API地址")
    .default("https://oxygennotincluded.fandom.com/zh/api.php"),
  keyboardId: Schema.string().description("按钮ID"),
  imgPath: Schema.string()
    .description("图片储存在本地的路径")
    .default(os.homedir() + "wikiImg\\"),
  publicUrl: Schema.string().description("图片的公开URL"),
});
export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger(name);
  // 注册命令
  ctx
    .command("cx <itemName>", "查询缺氧中文Wiki")
    .alias("/查")
    .option("update", "-u 使用输入的名称更新本地缓存")
    .option("delete", "-d 删除本地缓存")
    .option("rename", "-r <newName> 重命名本地缓存")
    .action(async ({ session, options }, itemName = "") => {
      logger.info(`newName: ${options.rename}, itemName: ${itemName}`);
      let filePath =
        config.imgPath +
        itemName.replace(/\//g, "-").replace(/:/g, "-").replace(/'/g, "-") +
        ".jpeg";
      if (options.update) {
        let url =
          "https://oxygennotincluded.fandom.com/zh/wiki/" + encodeURI(itemName);
        await lib.screenShot(url, ctx, itemName, config);
        return `已尝试为您更新${itemName}的缓存...}`;
      }
      if (options.delete) {
        let filePath = config.imgPath + itemName + ".jpeg";
        if (lib.checkFileExists(filePath)) {
          fs.unlinkSync(filePath);
          return `已尝试删除${itemName}的缓存...`;
        } else {
          return `文件不存在...`;
        }
      }
      if (options.rename) {
        if (lib.checkFileExists(filePath)) {
          fs.renameSync(filePath, config.imgPath + options.rename + ".jpeg");
          return `已尝试重命名文件...`;
        } else {
          return `文件不存在...`;
        }
      }
      // 主流程
      session.sendQueued("本轮查询开始....");
      await lib.delay(1000);
      // 判断文件是否在本地

      if (lib.checkFileExists(filePath)) {
        return `文件缓存已命中，缓存时间为：${lib.getFileModifyTime(
          filePath
        )} 请前往以下网址查看: \n ${
          config.publicUrl +
          encodeURI(
            itemName.replace(/\//g, "-").replace(/:/g, "-").replace(/'/g, "-")
          )
        }.jpeg`;
      } else {
        // 没有缓存
        let res = await lib.getFromFandom(config.api, ctx, itemName);
        if (res.length === 0) {
          // session.send()
          return `在Wiki里没找到或API查询超时或....`;
        } else {
          const title = [...res[0]];
          let res_url: string[] = [...res[1]];
          logger.info(`API返回的数据为: ${title}`);
          if (title[0] === itemName) {
            return lib.screenShot(res_url[0], ctx, itemName, config);
          } else {
            let [
              one = "曼德拉草汤",
              two = "火龙果派",
              three = "大肉汤",
              four = "饺子",
              five = "萌新骨头汤",
            ] = title;
            await lib.sendMarkdown(
              config.botId,
              config.token,
              session.channelId,
              config.mdId,
              {
                one,
                two,
                three,
                four,
                five,
              },
              config.keyboardId
            );
            const awlist = [1, 2, 3, 4, 5];
            const awser =
              +(await session.prompt(50 * 1000))
                ?.replace(/\s+/g, "")
                ?.slice(-1) || NaN;
            if (awlist.includes(awser)) {
              return lib.screenShot(res_url[awser - 1], ctx, itemName, config);
            } else if (Number.isNaN(awser)) {
              return `您输入的选项有误，已完结本轮查询。如需，如有需要，请重新发起查询.`;
            }
          }
        }
      }
    });
}
