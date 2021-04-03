import Discord from 'discord.js';
import {discordBotToken} from './config.js';

import auction from './auction.js';
import whManager from './WebhookManager.js';

const client = new Discord.Client();

const auc = new auction();      // 경매장 관련
const whm = new whManager();    // 웹훅 매니저

let lastEventMsg = null;
let botMode = null;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {

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
                    {name: "Step 6", value: "채팅창에 \"웹후크 등록,[아까 복사한 URL]\"을 입력해 줍니다."},
                );

            msg.channel.send("웹후크를 먼저 등록해 주세요.")
                .then(() => {
                    msg.channel.send("웹후크를 먼저 등록해 주세요.", embed);
                });
        } else {
            let searchName = msg.content.split(",")[1];

            lastEventMsg = msg;
            auc.lastEventMsg = msg;

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