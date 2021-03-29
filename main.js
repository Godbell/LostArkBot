import Discord from 'discord.js';
import {discordBotToken} from './config.js';
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
                .replace(/<p.*>/gi, '')
                .replace(/<\/p>/gi, '')
                .replace(/<\/font>/gi, '')
                .replace(/<font.*>/gi, '')
                .split(/data-item="/gi)[1]
                .split(/"><img/)[0];
            ;
            let itemJson = JSON.parse(item);
            console.log(itemJson);

            // ELEMENT 000: 공통, 아이템 이름
            let embed = {
                    color: '#0099ff',
                    title: itemJson['Element_000']['value'],    // 아이템 이름
                    fields: [ ]
                };

            // ELEMENT 001: 공통, 등급 및 종류
            embed['fields'].push({name: '등급', value: itemJson['Element_001']['value']['leftStr0'], inline: true});

            let typeOfItem = itemJson['Element_001']['value']['leftStr0'].split(' ')[1];
            if (typeOfItem != '어빌리티') {
                // 어빌리티 스톤은 품질 값이 없음
                embed['fields'].push({name: '품질', value: itemJson['Element_001']['value']['qualityValue'], inline: true});
            }

            // ELEMENT 002: 무기/방어구에만 존재, 전용 직업
            if (typeOfItem != '어빌리티' && typeOfItem != '목걸이' && typeOfItem != '귀걸이' && typeOfItem != '반지' && typeOfItem != '힘을')
            {
                embed['fields'].push({name: '직업', value: itemJson['Element_002']['value'], inline: true});
            }

            // ELEMENT 003: 공통, 거래 정보
            embed['fields'].push({name: '거래 정보', value: itemJson['Element_003']['value'], inline: true});

            // ELEMENT 004: 어빌리티 스톤과 무기/방어구는 기본 효과, 장신구는 단일 장착 가능 여부, 힘을 잃은 장비는 트라이포드 효과
            if (typeOfItem == '목걸이' || typeOfItem == '귀걸이' || typeOfItem == '반지')
            {
                embed['fields'].push({name: '단일 장착 가능 여부', value: itemJson['Element_004']['value']});
            }
            else if (typeOfItem == '힘을')
            {
                embed['fields'].push({name: '트라이포드 효과', value: itemJson['Element_004']['value']['Element_000']['contentStr']['Element_000']['contentStr'] + " / " + itemJson['Element_004']['value']['Element_000']['contentStr']['Element_001']['contentStr']});
            }
            else
            {
                embed['fields'].push({name: '기본 효과', value: itemJson['Element_004']['value']['Element_001']})
            }

            // ELEMENT 005: 장신구는 기본 효과, 어빌리티 스톤은 무작위 각인 효과, 무기/방어구는 추가 효과, 힘을 잃은 장비는 설명
            // ELEMENT 006: 장신구는 추가 효과, 어빌리티 스톤은 세공 필요 메시지, 무기/방어구는 현재 단계 재련 경험치, 힘을 잃은 장비는 입수처
            // ELEMENT 007: 장신구는 무작위 각인 효과, 어빌리티 스톤은 제한사항, 무기/방어구는 트라이포드 효과, 힘을 잃은 장비는 내구도
            if (typeOfItem == '장신구')
            {
                embed['fields'].push({name: '기본 효과', value: itemJson['Element_005']['value']['Element_001'], inline: true});
                embed['fields'].push({name: '추가 효과', value: itemJson['Element_006']['value']['Element_001'], inline: true});
                embed['fields'].push({name: '무작위 각인 효과', value: itemJson['Element_007']['value']['Element_001'], inline: true});
            }
            else if (typeOfItem == '어빌리티')
            {
                embed['fields'].push({name: '무작위 각인 효과', value: itemJson['Element_005']['Element_001']});
                embed['fields'].push({name: '메시지', value: itemJson['Element_006']['value']});
                embed['fields'].push({name: '제한 사항', value: itemJson['Element_007']['value']});
            }
            else if (typeOfItem == '힘을')
            {
                embed['fields'].push({name: '설명', value: itemJson['Element_005']['value']});
                embed['fields'].push({name: '입수처', value: itemJson['Element_006']['value']});
                // 내구도 생략
            }
            else
            {
                embed['fields'].push({name: '추가 효과', value: itemJson['Element_005']['value']['Element_001']});
                embed['fields'].push({name: '현재 단계 재련 경험치', value: itemJson['Element_006']['value']['value'] + " / " + itemJson['Element_006']['value']['maximum']});
                embed['fields'].push({name: '트라이포드 효과', value: itemJson['Element_007']['value']['Element_000']['contentStr']['Element_000']['contentStr'] + " / " + itemJson['Element_007']['value']['Element_000']['contentStr']['Element_001']['contentStr']});
            }

            // ELEMENT 008: 장신구랑 무기/방어구는 품질 업그레이드 가능 여부, 어빌리티 스톤은 입수처
            if (typeOfItem != '힘을') {
                if (typeOfItem != '어빌리티') {
                    embed['fields'].push({name: '품질 업그레이드 가능 여부', value: itemJson['Element_008']['value']});
                } else {
                    embed['fields'].push({name: '입수처', value: itemJson['Element_008']['value']});
                }

                // ELEMENT 009: 장신구랑 무기/방어구는 입수처, 어빌리티 스톤에는 없음
                if (typeOfItem != '어빌리티') {
                    embed['fields'].push({name: '입수처', value: itemJson['Element_009']['value']});
                }
            }
            embeds.embeds.push(embed);
        }
        whm.sendWebhook(
            lastEventMsg.channel.id,
            embeds);
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
                    {name: "Step 6", value: "채팅창에 \"웹후크 등록,[아까 복사한 URL]\"을 입력해 줍니다."},
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