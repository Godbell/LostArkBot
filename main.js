import Discord from 'discord.js';
import {discordBotToken} from './config.js';
import nodeHtmlToImage from 'node-html-to-image';
import pkg from "node-html-parser";

import auction from './auction.js';
import whManager from './WebhookManager.js';

const client = new Discord.Client();
const {parse} = pkg;

const auc = new auction();      // 경매장 관련
const whm = new whManager();    // 웹훅 매니저
var lastEventMsg = null;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    auc.http.addEventListener("load", () => {

        let responseHtmlString = auc.http.responseText;
        let root = parse(responseHtmlString);
        let res = root.querySelectorAll(".slot");
        console.log(res);

        let embeds = {
            "embeds": []
        };

        for (let i = 0; i < res.length; i++) {
            let item = res[i];
            item = item.toString().replace(/&quot;/gi, '\"')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/<BR>/g, ' / ')
                .replace(/<p.*;>/gi, '')
                .replace(/<\/p>/gi, '')
                .replace(/<\/font>/gi, '')
                .replace(/<font.*>/gim, '')
                .split(/data-item="/gi)[1]
                .split(/"><img/)[0];
            ;
            let itemJson = JSON.parse(item);
            console.log(itemJson);
            let embed = {
                    color: '#0099ff',
                    title: itemJson['Element_000']['value'],
                    fields: [
                        {name: '등급', value: itemJson['Element_001']['value']['leftStr0'], inline: true},
                        {name: '품질', value: itemJson['Element_001']['value']['qualityValue'], inline: true},
                        {name: '티어', value: itemJson['Element_001']['value']['leftStr2'], inline: true},
                        {name: '거래 정보', value: itemJson['Element_003']['value'], inline: true},
                        {name: '단일 장착 가능 여부', value: itemJson['Element_004']['value']},
                        {name: '기본 효과', value: itemJson['Element_005']['value']['Element_001'], inline: true},
                        {name: '추가 효과', value: itemJson['Element_006']['value']['Element_001'], inline: true},
                        {name: '무작위 각인 효과', value: itemJson['Element_007']['value']['Element_001'], inline: true},
                        {name: '품질 업그레이드 가능 여부', value: itemJson['Element_008']['value']},
                        {name: '입수처', value: itemJson['Element_009']['value']}
                        ]
                };
            embeds.embeds.push(embed);
        }
        whm.sendWebhook(
            lastEventMsg.channel.id,
            embeds);

        nodeHtmlToImage(
            {
                html: "<html><body>" + auc.http.responseText + "</body></html>",
                output: './image.png'
            }
        ).then(res => {
            console.log('The image was created successfully');
            lastEventMsg.channel.send(
                new Discord.MessageAttachment('./image.png', `img` + ".jpeg")
            )
        });
    });
});

client.on('message', msg => {
    console.log(msg.content);

    // 테스트
    if (msg.content === 'ping') {
        msg.reply('Pong!');
    }

    // 웹훅
    if (msg.content.split(",")[0].includes("웹후크 등록")) {
        whm.registerWebhook(msg.content.split(",")[1]);
    }

    // 경매장
    if (msg.content.split(",")[0].includes("경매장검색")) {
        if (whm.findWebhookWithChannelId(msg.channel.id) == null) {
            const embed = new Discord.MessageEmbed()
                .setTitle("웹후크 등록 방법")
                .addFields(
                    {name: "Step 1", value: "디스코드 서버 설정에 들어갑니다."},
                    {name: "Step 2", value: "[연동] 탭에 들어갑니다."},
                    {name: "Step 3", value: "[웹후크] 칸의 [웹후크 보기]를 클릭합니다."},
                    {name: "Step 4", value: "[새 웹후크]를 눌러 웹후크를 만듭니다."},
                    {name: "Step 5", value: "[웹후크 URL 복사]를 클릭합니다."},
                    {name: "Step 6", value: "채팅창에 \"웹후크 등록:[아까 복사한 URL]\"을 입력해 줍니다."},
                );

            msg.channel.send("웹후크를 먼저 등록해 주세요.")
                .then(() => {
                    msg.channel.send(embed);
                });
        } else {
            let searchName = msg.content.split(",")[1];
            lastEventMsg = msg;

            // send webhookURL
            auc.search(searchName);
        }
    }
});

client.once('ready', () => {
    console.log('Ready!');
});

client.login(discordBotToken);

//toString().json()