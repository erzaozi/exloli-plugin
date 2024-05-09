import Config from "./components/Config.js";
import lodash from "lodash";
import path from "path";
import { pluginRoot } from "./model/path.js";

export function supportGuoba() {
    return {
        pluginInfo: {
            name: 'exloli-plugin',
            title: '萝莉漫画插件',
            author: ['@CikeyQi', '@erzaozi'],
            authorLink: ['https://github.com/CikeyQi', 'https://github.com/erzaozi'],
            link: 'https://github.com/erzaozi/exloli-plugin',
            isV3: true,
            isV2: false,
            showInMenu: true,
            description: '基于 Yunzai 的萝莉漫画推送插件',
            // 显示图标，此为个性化配置
            // 图标可在 https://icon-sets.iconify.design 这里进行搜索
            icon: 'noto:panda',
            // 图标颜色，例：#FF0000 或 rgb(255, 0, 0)
            iconColor: '#d19f56',
            // 如果想要显示成图片，也可以填写图标路径（绝对路径）
            iconPath: path.join(pluginRoot, 'resources/readme/girl.png'),
        },
        configInfo: {
            schemas: [
                {
                    component: "Divider",
                    label: "Exloli 推送配置",
                    componentProps: {
                        orientation: "left",
                        plain: true,
                    },
                },
                {
                    field: "push_list.users",
                    label: "私聊推送配置",
                    bottomHelpMessage: "需要推送的列表",
                    component: "GSubForm",
                    componentProps: {
                        multiple: true,
                        schemas: [
                            {
                                field: "push_bot",
                                label: "推送使用的Bot",
                                component: "Input",
                                required: true,
                            },
                            {
                                field: "push_user",
                                label: "推送的用户",
                                component: "Input",
                                required: true,
                            }
                        ],
                    },
                },
                {
                    field: "push_list.groups",
                    label: "群聊推送配置",
                    bottomHelpMessage: "需要推送的列表",
                    component: "GSubForm",
                    componentProps: {
                        multiple: true,
                        schemas: [
                            {
                                field: "push_bot",
                                label: "推送使用的Bot",
                                component: "Input",
                                required: true,
                            },
                            {
                                field: "push_group",
                                label: "推送的群聊",
                                component: "Input",
                                required: true,
                            }
                        ],
                    },
                },
                {
                    component: "Divider",
                    label: "Exloli 设置",
                    componentProps: {
                        orientation: "left",
                        plain: true,
                    },
                },
                {
                    field: "lolicon_token",
                    label: "数据库Token",
                    bottomHelpMessage: "数据库Token",
                    component: "Input",
                    componentProps: {
                        placeholder: '请输入数据库Token',
                    },
                },
                {
                    field: "push_pic",
                    label: "推送漫画设置",
                    bottomHelpMessage: "更新时是否开启推送漫画内容",
                    component: "Switch",
                },
                {
                    field: "send_base64",
                    label: "推送图片设置",
                    bottomHelpMessage: "漫画以base64发送，用以解决图片发不出的问题",
                    component: "Switch",
                },
            ],
            getConfigData() {
                let config = Config.getConfig()
                config["push_list"].users = [];
                config["push_list"].user.forEach(user => {
                    config["push_list"].users.push({ push_bot: user.split(":")[0], push_user: user.split(":")[1] });
                });
                config["push_list"].groups = [];
                config["push_list"].group.forEach(group => {
                    config["push_list"].groups.push({ push_bot: group.split(":")[0], push_group: group.split(":")[1] });
                })
                return config
            },

            setConfigData(data, { Result }) {
                let config = {};
                for (let [keyPath, value] of Object.entries(data)) {
                    lodash.set(config, keyPath, value);
                }
                config = lodash.merge({}, Config.getConfig(), config);

                config["push_list"].user = []
                config["push_list"].users.forEach(({ push_bot, push_user }) => {
                    config["push_list"].user.push(`${push_bot}:${push_user}`);
                });
                delete config["push_list"].users;

                config["push_list"].group = []
                config["push_list"].groups.forEach(({ push_bot, push_group }) => {
                    config["push_list"].group.push(`${push_bot}:${push_group}`);
                });
                delete config["push_list"].groups;

                Config.setConfig(config);
                return Result.ok({}, '保存成功~');
            },
        },
    }
}