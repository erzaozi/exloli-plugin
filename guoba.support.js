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
                    field: "f_srdd",
                    label: "最低评分",
                    bottomHelpMessage: "评分低于此的内容将不会被推送",
                    component: "InputNumber",
                    componentProps: {
                        placeholder: '请输入最低评分',
                        min: 0,
                        max: 5,
                        step: 1,
                    },
                },
                {
                    field: "max_pages",
                    label: "最大页码",
                    bottomHelpMessage: "页码数高于此的内容将不会被推送",
                    component: "InputNumber",
                    componentProps: {
                        placeholder: '请输入最大页码',
                        min: 1,
                        max: 1000,
                        step: 1,
                    },
                },
                {
                    field: "search_param",
                    label: "搜索词条",
                    bottomHelpMessage: "仅推送与参数相关的内容",
                    component: "GTags",
                    componentProps: {
                        placeholder: '请输入您的搜索词条',
                        allowAdd: true,
                        allowDel: true,
                        showPrompt: true,
                        promptProps: {
                            content: '请输入您的搜索词条',
                            placeholder: '',
                            okText: '添加',
                            rules: [
                                { required: true, message: 'Cookie不能为空' }
                            ],
                        },
                        valueParser: ((value) => value.split(',') || []),
                    },
                },
                {
                    field: 'category',
                    label: 'Exloli 搜索标签',
                    component: "Select",
                    bottomHelpMessage: '在选中标签下的漫画都会被推送',
                    componentProps: {
                        allowAdd: true,
                        allowDel: true,
                        mode: 'multiple',
                        options: [
                            { label: "同人", value: 'Doujinshi' },
                            { label: "漫画", value: "Manga" },
                            { label: "艺术CG", value: "ArtistCG" },
                            { label: "游戏CG", value: "GameCG" },
                            { label: "欧美", value: "Western" },
                            { label: "无色情", value: "NonH" },
                            { label: "图集", value: "ImageSet" },
                            { label: "Coser", value: "Cosplay" },
                            { label: "亚洲", value: "AsianPorn" },
                            { label: "杂项", value: "Misc" }
                        ],
                    },
                },
                {
                    component: "Divider",
                    label: "Exloli 账号配置",
                    componentProps: {
                        orientation: "left",
                        plain: true,
                    },
                },
                {
                    field: "ex_account.ipb_member_id",
                    label: "ipb_member_id",
                    bottomHelpMessage: "里站必填",
                    component: "Input",
                    componentProps: {
                        placeholder: '请输入ipb_member_id',
                    },
                },
                {
                    field: "ex_account.ipb_pass_hash",
                    label: "ipb_pass_hash",
                    bottomHelpMessage: "里站必填",
                    component: "Input",
                    componentProps: {
                        placeholder: '请输入ipb_pass_hash',
                    },
                },
                {
                    field: "ex_account.igneous",
                    label: "igneous",
                    bottomHelpMessage: "里站必填",
                    component: "Input",
                    componentProps: {
                        placeholder: '请输入igneous',
                    },
                },
                {
                    component: "Divider",
                    label: "Exloli 推送配置",
                    componentProps: {
                        orientation: "left",
                        plain: true,
                    },
                },
                {
                    component: "Divider",
                    label: "Exloli 管理员设置",
                    componentProps: {
                        orientation: "left",
                        plain: true,
                    },
                },
                {
                    field: "password",
                    label: "password",
                    bottomHelpMessage: "PDF万能密码",
                    component: "Input",
                    componentProps: {
                        placeholder: '请输入password',
                    },
                },
                {
                    field: "push_pic",
                    label: "推送漫画设置",
                    bottomHelpMessage: "开启推送漫画内容",
                    component: "Switch",
                },
                {
                    field: "isEx",
                    label: "里站设置",
                    bottomHelpMessage: "开启后将使用里站，请确保你的账号token全部填写",
                    component: "Switch",
                },

                {
                    field: "local_save",
                    label: "漫画保存本地",
                    bottomHelpMessage: "所有推送的漫画都会保存本地，记得及时清理哦",
                    component: "Switch",
                },
                {
                    component: "Divider",
                    label: "Exloli 代理设置",
                    componentProps: {
                        orientation: "left",
                        plain: true,
                    },
                },
                {
                    field: "proxy.enable",
                    label: "启用代理",
                    bottomHelpMessage: "代理开关",
                    component: "Switch",
                },
                {
                    field: "proxy.host",
                    label: "代理地址",
                    bottomHelpMessage: "代理服务器地址",
                    component: "Input",
                    componentProps: {
                        placeholder: '请输入代理地址',
                    },
                },
                {
                    field: "proxy.port",
                    label: "代理端口",
                    bottomHelpMessage: "代理服务器端口",
                    component: "InputNumber",
                    componentProps: {
                        placeholder: '请输入代理端口',
                        min: 1,
                        max: 65535,
                        step: 1,
                    },
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
                let newCategory = config.category
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
                config.category = newCategory
                Config.setConfig(config);
                return Result.ok({}, '保存成功~');
            },
        },
    }
}