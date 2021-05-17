import Discord from 'discord.js';
import {discordBotToken} from './config.js';
import express from "express";
import bodyParser from "body-parser";
import lzString from 'lz-string';

import auction from './auction.js';
import whManager from './WebhookManager.js';

const client = new Discord.Client();

const auc = new auction();      // 경매장 관련
const whm = new whManager();    // 웹훅 매니저

let lastEventMsg = null;
let botMode = null;

//

const server = express();
server.use(bodyParser.json());

server.get("/api/LostArk/itemToolTip", (req, res) =>
{
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const url = new URL('http://localhost:3000' + req.originalUrl);
    const urlParams = url.searchParams;

    let itemJson = JSON.parse(lzString.decompressFromEncodedURIComponent(urlParams.get('Item-Json')));
    let typeOfItem = findSlot(itemJson['tooltip'], '아이템 종류')['value'];
    let tooltipStr = '<!DOCTYPE html>' +
        '<html lang="en">' +
        '<head>' +
        '    <meta charset="UTF-8">' +
        '    <title>Item ToolTip</title>' +
        '</head>' +
        '<link rel="stylesheet" href="https://cdn-lostark.game.onstove.com/2018/obt/assets/css/pc.css?v=20210401103055">' +
        '<body>';

    // name: 아이템 이름
    tooltipStr
        += '<div class="game-tooltip game-tooltip-item" data-grade="3" style="position: absolute;"><div class="NameTagBox">'
        + findSlot(itemJson['tooltip'], '아이템 이름')['value']
        + '</div>';

    tooltipStr
        += '<div class="ItemTitle">';
    tooltipStr
        += '<span class="slotData" data-grade="3"><img src="' + findSlot(itemJson['tooltip'], '아이템 이미지')['value'] + '" alt=""></span>';
    // name: 아이템 종류
    tooltipStr
        += '<span class="leftStr0">'+ findSlot(itemJson['tooltip'], '아이템 종류')['value'] +'</span>';
    tooltipStr
        += '<span class="rightStr0"></span>';

    if (!typeOfItem.includes('어빌리티')) {
        // 어빌리티 스톤은 품질, 아이템 레벨 값이 없음
        // name: 아이템 레벨
        tooltipStr
            += '<span class="leftStr2">' + findSlot(itemJson['tooltip'], '아이템 레벨')['value'] + '</span>';
        // name: 품질
        tooltipStr
            += '<span class="qualityValue q2"><span class="bar_txt"><font size="14">품질</font>'
            + ' ' + findSlot(itemJson['tooltip'], '품질')['value']
            + '</span><span class="bar" style="width: ' + parseInt(findSlot(itemJson['tooltip'], '품질')['value']) + '%"></span></span>';
    }
    tooltipStr += '</div>';

    tooltipStr
        += '<div class="SingleTextBox">';

    // name: 전용 직업
    if (!typeOfItem.includes( '어빌리티')
        && !typeOfItem.includes( '목걸이')
        && !typeOfItem.includes( '귀걸이')
        && !typeOfItem.includes( '반지')
        && !typeOfItem.includes( '힘을'))
    {
        tooltipStr
            += findSlot(itemJson['tooltip'], '전용 직업')['value'].replace(/'/g, "");
    }
    else if (typeOfItem.includes( '힘을'))
    {
        tooltipStr
            += '<FONT SIZE=\'12\'><FONT COLOR=\'#FF0000\'>' + '[직업표시 미지원]' + '</FONT></FONT>';
    }
    tooltipStr += '</div>';

    // name: 거래 정보
    tooltipStr
        += '<div class="MultiTextBox">';
    tooltipStr
        += findSlot(itemJson['tooltip'], '거래 정보')['value'];
    tooltipStr
        += '</div>';

    if (typeOfItem.includes( '목걸이')
        || typeOfItem.includes( '귀걸이')
        || typeOfItem.includes('반지'))
    {
        // name: 단일 장착 가능 여부
        tooltipStr
            += '<div class="SingleTextBox">';
        tooltipStr
            += findSlot(itemJson['tooltip'], '단일 장착 가능 여부')['value'];
        tooltipStr
            += '</div>';
    }
    else if (typeOfItem.includes( '힘을'))
    {
        // name: 트라이포드 효과
        let tripodStr = '<div>';
        for(let j = 0 ; j < findSlot(itemJson['tooltip'], '트라이포드 효과')['value'].split(',').length ; j++) {
            tripodStr += '<span>' + findSlot(itemJson['tooltip'], '트라이포드 효과')['value'].split(',')[j]
                    + '</span>';
        }
        tripodStr += '</div>';
        tooltipStr
            += '<div class="IndentStringGroup"><span>'
            + '트라이포드 효과'
            + '</span>'
            + tripodStr
            + '</div>';
    }
    else
    {
        // name: 기본 효과
        tooltipStr
            += '<div class="ItemPartBox"><span>' + '기본 효과' + '</span>';
        tooltipStr
            += '<span>' + findSlot(itemJson['tooltip'], '기본 효과')['value'] +'</span>';
        tooltipStr
            += '</div>';
    }

    if (typeOfItem.includes( '목걸이')
        || typeOfItem.includes( '귀걸이')
        || typeOfItem.includes('반지'))
    {
        //name: 기본 효과
        tooltipStr
            += '<div class="ItemPartBox"><span>' + '기본 효과'+ '</span>';
        tooltipStr
            += '<span>' + findSlot(itemJson['tooltip'], '기본 효과')['value'] +'</span>';
        tooltipStr
            += '</div>'

        //name: 추가 효과
        tooltipStr
            += '<div class="ItemPartBox"><span>' + '추가 효과' +'</span>';
        tooltipStr
            += '<span>' + findSlot(itemJson['tooltip'], '추가 효과')['value'] +'</span>';
        tooltipStr
            += '</div>'

        //name: 추가 효과
        tooltipStr
            += '<div class="ItemPartBox"><span>' + '무작위 각인 효과' +'</span>';
        tooltipStr
            += '<span>' + findSlot(itemJson['tooltip'], '무작위 각인 효과')['value'] +'</span>';
        tooltipStr
            += '</div>'
    }
    else if (typeOfItem.includes( '어빌리티'))
    {
        //name: 무작위 각인 효과
        //tooltip.push({name: '무작위 각인 효과', value: itemJson['Element_005']['value']['Element_001']});

        //name: 메시지
        //tooltip.push({name: '메시지', value: itemJson['Element_006']['value']});

        //name: 제한 사항
        //tooltip.push({name: '제한 사항', value: itemJson['Element_007']['value']});
    }
    else if (typeOfItem.includes( '힘을'))
    {
        //name: 설명
        tooltipStr
            += '<div class="SingleTextBox">'
            + findSlot(itemJson['tooltip'], '설명')['value']
            + '</div>';

        //name: 입수처
        tooltipStr
            += '<div class="SingleTextBox">'
            + findSlot(itemJson['tooltip'], '입수처')['value']
            + '</div>';

        //name: 내구도
        tooltipStr
            += '<div class="ShowMeTheMoney">'
            + findSlot(itemJson['tooltip'], '내구도')['value']
            + '</div>';
    }
    else
    {
        //name: 추가 효과
        tooltipStr
            += '<div class="ItemPartBox"><span>' + '추가 효과' +'</span>';
        tooltipStr
            += '<span>' + findSlot(itemJson['tooltip'], '추가 효과')['value'] +'</span>';
        tooltipStr
            += '</div>'

        //name: 현재 단계 재련 경험치
        tooltipStr
            += '<div class="Progress"><span>'
            + '현재 단계 재련 경험치'
            +'</span>'
        tooltipStr
            += '<div class="graph">'
            + '<span class="bar" style="width: '
            + findSlot(itemJson['tooltip'], '현재 단계 재련 경험치')['value']
            + '%"></span>'
            + '<span class="text">' + findSlot(itemJson['tooltip'], '현재 단계 재련 경험치')['value'] + '</span>'
            + '</div>';
        tooltipStr += '</div>';

        //name: 트라이포드 효과
        let tripodStr = '<div>';
        for(let j = 0 ; j < findSlot(itemJson['tooltip'], '트라이포드 효과')['value'].split(',').length ; j++) {
            tripodStr += '<span>' + findSlot(itemJson['tooltip'], '트라이포드 효과')['value'].split(',')[j]
                + '</span>';
        }
        tripodStr += '</div>';
        tooltipStr
            += '<div class="IndentStringGroup"><span>'
            + '트라이포드 효과'
            + '</span>'
            + tripodStr
            + '</div>';
    }

    if (!typeOfItem.includes( '힘을')) {
        if (!typeOfItem.includes( '어빌리티')) {
            //name: 품질 업그레이드 가능 여부
            tooltipStr
                += '<div class="SingleTextBox">'
                + '<span>'
                + findSlot(itemJson['tooltip'], '품질 업그레이드 가능 여부')['value']
                + '</span>'
                + '</div>';
        } else {
            //name: 입수처
            tooltipStr
                += '<div class="SingleTextBox">'
                + '<span>'
                + findSlot(itemJson['tooltip'], '입수처')['value']
                + '</span>'
                + '</div>';
        }

        // ELEMENT 009: 장신구랑 무기/방어구는 입수처, 어빌리티 스톤에는 없음
        if (!typeOfItem.includes( '어빌리티')) {
            //name: 입수처
            tooltipStr
                += '<div class="SingleTextBox">'
                + '<span>'
                + findSlot(itemJson['tooltip'], '입수처')['value']
                + '</span>'
                + '</div>';
        }

        if (!typeOfItem.includes('어빌리티'))
        {
            //name: 내구도
            tooltipStr
                += '<div class="ShowMeTheMoney">'
                + findSlot(itemJson['tooltip'], '내구도')['value']
                + '</div>';
        }
    }

    tooltipStr
        += '</div></body></html>';

    res.send(tooltipStr);
});

server.listen(3000, () => {
    console.log("Server Running");
});

//

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {

    // 테스트
    if (msg.content === 'ping') {
        msg.reply('Pong!');
    }

    // 웹훅
    if (msg.content.split(",")[0].includes("웹후크 등록")
        || msg.content.split(",")[0].includes("웹후크등록")
        || msg.content.split(",")[0].includes("-regwh")
    ) {
        whm.registerWebhook(msg.content.split(",")[1]);
    }

    // 경매장
    if (msg.content.split(",")[0].includes("경매장검색")
        || msg.content.split(",")[0].includes("경매장")
        || msg.content.split(",")[0].includes("경매장 검색")
        || msg.content.split(",")[0].includes("-aucs")
    ) {
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
            botMode = 'MODE_AUCTION';
            auc.search(searchName);
        }
    }

    if (msg.content.split(",")[0].includes("다음페이지")
    || msg.content.split(",")[0].includes("다음")
    || msg.content.split(",")[0].includes("다음 페이지")
    || msg.content.split(",")[0].includes("-next")
    || msg.content.split(",")[0].includes("이전페이지")
    || msg.content.split(",")[0].includes("이전")
    || msg.content.split(",")[0].includes("이전 페이지")
    || msg.content.split(",")[0].includes("-prev")
    ) {
        if (botMode == null) msg.reply('현재 경매장 검색중이 아닙니다.');
        else if (botMode == 'MODE_AUCTION')
        {
            if (msg.content.split(",")[0].includes("이전페이지")
            || msg.content.split(",")[0].includes("이전")
            || msg.content.split(",")[0].includes("이전 페이지")
            || msg.content.split(",")[0].includes("-prev"))
            {
                if (auc.lastfoundDataPage == 1)
                {
                    msg.reply('이미 첫 번째 페이지입니다.');
                }
                else
                {
                    let searchName = msg.content.split(",")[1];

                    lastEventMsg = msg;
                    auc.search(searchName, auc.lastfoundDataPage - 1);
                }
            }
            else
            {
                let searchName = msg.content.split(",")[1];

                lastEventMsg = msg;
                auc.search(searchName, auc.lastfoundDataPage + 1);
            }
        }
    }
});


client.once('ready', () => {
    console.log('Ready!');
});

client.login(discordBotToken);

//

function findSlot(slots, value)
{
    for (let i = 0 ; i < slots.length ; i++)
    {
        if (slots[i]['name'] == value) return slots[i];
    }
    return null;
}

function resetMode()
{
    botMode = null;
}