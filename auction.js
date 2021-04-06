import Discord from 'discord.js';
import XMLHttpRequest from 'xmlhttprequest';
import nodeHtmlParser from "node-html-parser";
const {parse} = nodeHtmlParser;
import fileStream from 'fs';

import whManager from './WebhookManager.js';
const whm = new whManager();    // 웹훅 매니저

export default class auction
{
    constructor() {
        this.ItemSearchRequest = new XMLHttpRequest.XMLHttpRequest();
        this.itemTooltipRequest = new XMLHttpRequest.XMLHttpRequest();
        this.lastfoundDataPage = 1;
        this.lastfoundDataAmount = 0;
        this.lastfoundDataItemName = "";
        this.lastEventMsg = null;

        this.url = "https://m-lostark.game.onstove.com/Auction/GetAuctionList";
        this.nextPageEmoji = ':arrow_forward:';
        this.prevPageEmoji = ':arrow_backward:';
        this.firstPageEmoji = ':track_previous:';
        this.lastPageEmoji = ':track_next:';
        this.prev10PagesEmoji = ':rewind:';
        this.next10PagesEmoji = ':fast_forward:';
        this.itemTooltipHTMLTemplate = '';

        this.itemTooltipRequest.addEventListener("load", () => {
        });

        this.ItemSearchRequest.addEventListener("load", () => {
            let responseHtmlString = this.ItemSearchRequest.responseText;
            let root = parse(responseHtmlString);

            let isEmpty = root.querySelectorAll(".empty");
            if (isEmpty.length > 0)
            {
                whm.sendWebhook(this.lastEventMsg.channel.id
                    , '검색 결과가 없습니다.');
                return;
            }

            let imgSrc = root.querySelectorAll("img");
            let nameData = root.querySelectorAll('.name');
            let countData = root.querySelectorAll('.count');
            let timeData = root.querySelectorAll('.time');
            let effectData = root.querySelectorAll(".list__effect");
            let itemLevelData = root.querySelectorAll('.level');
            let gradeData = root.querySelectorAll('.list__detail');
            let aucData = root.querySelectorAll("tbody");

            let itemSlot = root.querySelectorAll(".slot");
            let resultAmountData = root.querySelectorAll("script");
            this.lastfoundDataAmount = parseInt(resultAmountData.toString().split('_totalCount = ')[1].replace(/[^0-9]/gim, ''));

            let embeds = {
                "embeds": []
            };

            for (let i = 0; i < nameData.length; i++) {
                imgSrc[i] = imgSrc[i].toString().split('"')[1];

                // ELEMENT 000: 공통, 아이템 이름
                let embed = {
                    color: '#0099ff',
                    url: '',
                    title: nameData[i].innerText,    // 아이템 이름
                    thumbnail: { url: imgSrc[i] },
                    fields: [ ]
                };

                embed['url'] = 'http://3.140.246.56:8080/api/LostArk/itemToolTip?test=' + i;

                embed['fields'].push({name: '거래 정보', value: countData[i].innerText, inline: true});

                embed['fields'].push({name: '티어 / 품질', value: gradeData[i].innerHTML.toString().split('<span>')[1].split('</span>')[0], inline: true});
                if (gradeData[i].innerHTML.toString().includes('아이템레벨'))
                    embed['fields'].push({name: '아이템레벨', value: gradeData[i].innerHTML.toString().split('<span aria-label="아이템레벨">')[1].split('</span>')[0], inline: true});

                let effectDataStr = ""
                effectData[i].childNodes.forEach(child => {
                    effectDataStr += child.innerText + '\n'
                });
                embed['fields'].push({name: '효과', value: effectDataStr});

                if (timeData[i] != undefined)
                    embed['fields'].push({name: '남은 시간', value: timeData[i].rawText});
                embed['fields'].push({name: '현재 최고가', value: aucData[i].childNodes[1].innerText.replace(/[^0-9]/gim, ''), inline: true});
                if (embed['fields'][embed['fields'].length - 1]['value'].length == 0)
                    embed['fields'][embed['fields'].length - 1]['value'] = '-';
                embed['fields'].push({name: '최소 입찰가', value: aucData[i].childNodes[3].innerText.replace(/[^0-9]/gim, ''), inline: true});
                if (embed['fields'][embed['fields'].length - 1]['value'].length == 0)
                    embed['fields'][embed['fields'].length - 1]['value'] = '-';
                embed['fields'].push({name: '즉시 구매가', value: aucData[i].childNodes[5].innerText.replace(/[^0-9]/gim, ''), inline: true});
                if (embed['fields'][embed['fields'].length - 1]['value'].length == 0)
                    embed['fields'][embed['fields'].length - 1]['value'] = '-';

                embeds['embeds'].push(embed);
            }

            let titem = itemSlot[0];
            titem = titem.toString().replace(/&quot;/gi, '\"')
                .replace(/&#39;/g, '\'')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .split(/"><img/)[0]
                .split(/data-item="/gi)[1];
            console.log(titem);

            let tooltipHtml = [];
            for(let i = 0 ; i < itemSlot.length ; i++)
            {
                let item = itemSlot[i];
                item = item.toString().replace(/&quot;/gi, '\"')
                    .replace(/&#39;/gi, '\'')
                    .replace(/&lt;/gi, '<')
                    .replace(/&gt;/gi, '>')
                    .split(/"><img/)[0]
                    .split(/data-item="/gi)[1];
                let itemJson = JSON.parse(item);
                let tooltip = [];
                let tooltipStr = '<!DOCTYPE html>' +
                    '<html lang="en">' +
                    '<head>' +
                    '    <meta charset="UTF-8">' +
                    '    <title>Item ToolTip</title>' +
                    '</head>' +
                    '<link rel="stylesheet" href="https://cdn-lostark.game.onstove.com/2018/obt/assets/css/pc.css?v=20210401103055">' +
                    '<body>';

                // Item ToolTip
                // ELEMENT 001: 공통, 등급 및 종류
                //tooltip.push({name: '등급', value: itemJson['Element_001']['value']['leftStr0'], inline: true});

                tooltip.push({name: '아이템 이름', value: itemJson['Element_000']['value']});
                tooltipStr
                    += '<div class="game-tooltip game-tooltip-item" data-grade="3" style="position: absolute;"><div class="NameTagBox">'
                    + itemJson['Element_000']['value']
                    + '</div>';
                let typeOfItem = itemJson['Element_001']['value']['leftStr0'];

                tooltipStr
                    += '<div class="ItemTitle">';
                tooltipStr
                    += '<span class="slotData" data-grade="3"><img src="' + imgSrc[i] + '" alt=""></span>';
                tooltip.push({name: '아이템 등급', value: itemJson['Element_001']['value']['leftStr0']});
                tooltip.push({name: '아이템 레벨', value: itemJson['Element_001']['value']['leftStr2']});
                tooltipStr
                    += '<span class="leftStr0">'+ itemJson['Element_001']['value']['leftStr0'] +'</span>';
                tooltipStr
                    += '<span class="rightStr0"></span>';
                if (!typeOfItem.includes('어빌리티')) {
                    // 어빌리티 스톤은 품질, 아이템 레벨 값이 없음
                    tooltip.push({name: '품질', value: itemJson['Element_001']['value']['qualityValue'], inline: true});
                    tooltip.push({name: '아이템 레벨', value: itemJson['Element_001']['value']['leftStr2']});

                    tooltipStr
                        += '<span class="leftStr2">' + itemJson['Element_001']['value']['leftStr2'] + '</span>';
                    tooltipStr
                        += '<span class="qualityValue q2"><span class="bar_txt"><font size="14">품질</font>'
                        + ' ' + itemJson['Element_001']['value']['qualityValue']
                        + '</span><span class="bar" style="width: ' + parseInt(itemJson['Element_001']['value']['qualityValue']) + '%"></span></span>';
                }
                tooltipStr += '</div>';

                tooltipStr
                    += '<div class="SingleTextBox">';
                // ELEMENT 002: 무기/방어구 및 힘을 잃은 장비에만 존재, 전용 직업
                if (!typeOfItem.includes( '어빌리티')
                    && !typeOfItem.includes( '목걸이')
                    && !typeOfItem.includes( '귀걸이')
                    && !typeOfItem.includes( '반지')
                    && !typeOfItem.includes( '힘을'))
                {
                    tooltip.push({name: '전용 직업', value: itemJson['Element_002']['value'], inline: true});
                    tooltipStr
                        += itemJson['Element_002']['value'].replace(/'/g, "");
                }
                else if (typeOfItem.includes( '힘을'))
                {
                    tooltip.push({name: '전용 직업', value: itemJson['Element_002']['value'], inline: true});
                    tooltipStr
                        += '<FONT SIZE=\'12\'><FONT COLOR=\'#FF0000\'>' + '전용 직업 표시 기능 점검중' + '</FONT></FONT>';
                }
                tooltipStr += '</div>';

                // ELEMENT 003: 공통, 거래 정보
                tooltip.push({name: '거래 정보', value: itemJson['Element_003']['value'], inline: true});

                tooltipStr
                    += '<div class="MultiTextBox">';
                tooltipStr
                    += itemJson['Element_003']['value'];
                tooltipStr
                    += '</div>';

                // ELEMENT 004: 어빌리티 스톤과 무기/방어구는 기본 효과, 장신구는 단일 장착 가능 여부, 힘을 잃은 장비는 트라이포드 효과
                if (typeOfItem.includes( '목걸이')
                    || typeOfItem.includes( '귀걸이')
                    || typeOfItem.includes('반지'))
                {
                    tooltip.push({name: '단일 장착 가능 여부', value: itemJson['Element_004']['value']});
                    tooltipStr
                        += '<div class="SingleTextBox">';
                    tooltipStr
                        += itemJson['Element_004']['value'];
                    tooltipStr
                        += '</div>';
                }
                else if (typeOfItem.includes( '힘을'))
                {
                    tooltip.push({name: '트라이포드 효과', value: itemJson['Element_004']['value']['Element_000']['contentStr']['Element_000']['contentStr'] + " / " + itemJson['Element_004']['value']['Element_000']['contentStr']['Element_001']['contentStr']});
                    let tripodStr = '<div>';
                    for(let j = 0 ; j < 999 ; j++) {
                        if (itemJson['Element_004']['value']['Element_000']['contentStr']['Element_' + j.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})]
                            != undefined) {
                            tripodStr += '<span>' + itemJson['Element_004']['value']['Element_000']['contentStr']['Element_' + j.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})]['contentStr']
                                + '</span>';
                        } else break;
                    }
                    tripodStr += '</div>';
                    tooltipStr
                        += '<div class="IndentStringGroup"><span>'
                        + itemJson['Element_004']['value']['Element_000']['topStr']
                        + '</span>'
                        + tripodStr
                        + '</div>';
                }
                else
                {
                    tooltip.push({name: '기본 효과', value: itemJson['Element_004']['value']['Element_001']});
                    tooltipStr
                        += '<div class="ItemPartBox"><span>' + itemJson['Element_004']['value']['Element_000'] +'</span>';
                    tooltipStr
                        += '<span>' + itemJson['Element_004']['value']['Element_001'] +'</span>';
                    tooltipStr
                        += '</div>'
                }

                // ELEMENT 005: 장신구는 기본 효과, 어빌리티 스톤은 무작위 각인 효과, 무기/방어구는 추가 효과, 힘을 잃은 장비는 설명
                // ELEMENT 006: 장신구는 추가 효과, 어빌리티 스톤은 세공 필요 메시지, 무기/방어구는 현재 단계 재련 경험치, 힘을 잃은 장비는 입수처
                // ELEMENT 007: 장신구는 무작위 각인 효과, 어빌리티 스톤은 제한사항, 무기/방어구는 트라이포드 효과, 힘을 잃은 장비는 내구도
                if (typeOfItem.includes( '목걸이')
                    || typeOfItem.includes( '귀걸이')
                    || typeOfItem.includes('반지'))
                {
                    tooltip.push({name: '기본 효과', value: itemJson['Element_005']['value']['Element_001'], inline: true});
                    tooltip.push({name: '추가 효과', value: itemJson['Element_006']['value']['Element_001'], inline: true});
                    tooltip.push({name: '무작위 각인 효과', value: itemJson['Element_007']['value']['Element_001'], inline: true});
                }
                else if (typeOfItem.includes( '어빌리티'))
                {
                    tooltip.push({name: '무작위 각인 효과', value: itemJson['Element_005']['value']['Element_001']});
                    tooltip.push({name: '메시지', value: itemJson['Element_006']['value']});
                    tooltip.push({name: '제한 사항', value: itemJson['Element_007']['value']});
                }
                else if (typeOfItem.includes( '힘을'))
                {
                    tooltip.push({name: '설명', value: itemJson['Element_005']['value']});
                    tooltipStr
                        += '<div class="SingleTextBox">'
                        + itemJson['Element_005']['value']
                        + '</div>';

                    tooltip.push({name: '입수처', value: itemJson['Element_006']['value']});
                    tooltipStr
                        += '<div class="SingleTextBox">'
                        + itemJson['Element_006']['value']
                        + '</div>';

                    tooltip.push({name: '내구도', value: itemJson['Element_007']['value']});
                    tooltipStr
                        += '<div class="ShowMeTheMoney">'
                        + itemJson['Element_007']['value']
                        + '</div>';
                }
                else
                {
                    tooltip.push({name: '추가 효과', value: itemJson['Element_005']['value']['Element_001']});
                    tooltipStr
                        += '<div class="ItemPartBox"><span>' + itemJson['Element_005']['value']['Element_000'] +'</span>';
                    tooltipStr
                        += '<span>' + itemJson['Element_005']['value']['Element_001'] +'</span>';
                    tooltipStr
                        += '</div>'

                    tooltip.push({name: '현재 단계 재련 경험치', value: itemJson['Element_006']['value']['value'] + " / " + itemJson['Element_006']['value']['maximum']});
                    tooltipStr
                        += '<div class="Progress"><span>'
                        + itemJson['Element_006']['value']['title']
                        +'</span>'
                    tooltipStr
                        += '<div class="graph">'
                        + '<span class="bar" style="width: '
                        + (parseInt(itemJson['Element_006']['value']['value']) / parseInt(itemJson['Element_006']['value']['maximum']) * 100.0)
                        + '%"></span>'
                        + '<span class="text">' + itemJson['Element_006']['value']['minimum'] + '/' + itemJson['Element_006']['value']['maximum'] + '</span>'
                        + '</div>';
                    tooltipStr += '</div>';

                    tooltip.push({name: '트라이포드 효과', value: itemJson['Element_007']});
                    let tripodStr = '<div>';
                    for(let j = 0 ; j < 999 ; j++) {
                        if (itemJson['Element_007']['value']['Element_000']['contentStr']['Element_' + j.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})]
                            != undefined) {
                            tripodStr += '<span>' + itemJson['Element_007']['value']['Element_000']['contentStr']['Element_' + j.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})]['contentStr']
                                + '</span>';
                        } else break;
                    }
                    tripodStr += '</div>';
                    tooltipStr
                        += '<div class="IndentStringGroup"><span>'
                        + itemJson['Element_007']['value']['Element_000']['topStr']
                        + '</span>'
                        + tripodStr
                        + '</div>';
                }

                // ELEMENT 008: 장신구랑 무기/방어구는 품질 업그레이드 가능 여부, 어빌리티 스톤은 입수처
                if (!typeOfItem.includes( '힘을')) {
                    if (!typeOfItem.includes( '어빌리티')) {
                        tooltip.push({name: '품질 업그레이드 가능 여부', value: itemJson['Element_008']['value']});
                        tooltipStr
                            += '<div class="SingleTextBox">'
                            + '<span>'
                            + itemJson['Element_008']['value']
                            + '</span>'
                            + '</div>';
                    } else {
                        tooltip.push({name: '입수처', value: itemJson['Element_008']['value']});
                        tooltipStr
                            += '<div class="SingleTextBox">'
                            + '<span>'
                            + itemJson['Element_008']['value']
                            + '</span>'
                            + '</div>';
                    }

                    // ELEMENT 009: 장신구랑 무기/방어구는 입수처, 어빌리티 스톤에는 없음
                    if (!typeOfItem.includes( '어빌리티')) {
                        tooltip.push({name: '입수처', value: itemJson['Element_009']['value']});
                        tooltipStr
                            += '<div class="SingleTextBox">'
                            + '<span>'
                            + itemJson['Element_009']['value']
                            + '</span>'
                            + '</div>';
                    }

                    if (!typeOfItem.includes('어빌리티'))
                    {
                        tooltip.push({name: '내구도', value: itemJson['Element_010']['value']});
                        tooltipStr
                            += '<div class="ShowMeTheMoney">'
                            + itemJson['Element_010']['value']
                            + '</div>';
                    }
                }

                tooltipStr
                    += '</div></body></html>';
                tooltipHtml.push(tooltipStr);
            }

            fileStream.writeFile('./output.html', tooltipHtml[0],
                (err) =>
                {
                    if (err) console.log(err);

                    whm.sendWebhook(
                        this.lastEventMsg.channel.id,

                        embeds);
                });

            // whm.sendWebhook(
            //     this.lastEventMsg.channel.id,
            //
            //     embeds);
        });
    }

    #getRequestBody(itemName, pageNo = 1)
    {
        let resultStr
            = "request%5BfirstCategory%5D=0&" +
            "request%5BsecondCategory%5D=0&" +
            "request%5BclassNo%5D=&" +
            "request%5BitemTier%5D=&" +
            "request%5BitemGrade%5D=&" +
            "request%5BitemLevelMin%5D=0&" +
            "request%5BitemLevelMax%5D=2000&" +
            "request%5BitemName%5D=" + encodeURIComponent(itemName) + "&" +
            "request%5BpageNo%5D=" + pageNo + "&" +
            "request%5BsortOption%5D%5BSort%5D=BIDSTART_PRICE&" +
            "request%5BsortOption%5D%5BIsDesc%5D=false&" +
            "request%5BgradeQuality%5D=&" +
            "request%5BskillOptionList%5D%5B0%5D%5BfirstOption%5D=&" +
            "request%5BskillOptionList%5D%5B0%5D%5BsecondOption%5D=&" +
            "request%5BskillOptionList%5D%5B0%5D%5BminValue%5D=&" +
            "request%5BskillOptionList%5D%5B0%5D%5BmaxValue%5D=&" +
            "request%5BskillOptionList%5D%5B1%5D%5BfirstOption%5D=&" +
            "request%5BskillOptionList%5D%5B1%5D%5BsecondOption%5D=&" +
            "request%5BskillOptionList%5D%5B1%5D%5BminValue%5D=&" +
            "request%5BskillOptionList%5D%5B1%5D%5BmaxValue%5D=&" +
            "request%5BskillOptionList%5D%5B2%5D%5BfirstOption%5D=&" +
            "request%5BskillOptionList%5D%5B2%5D%5BsecondOption%5D=&" +
            "request%5BskillOptionList%5D%5B2%5D%5BminValue%5D=&" +
            "request%5BskillOptionList%5D%5B2%5D%5BmaxValue%5D=&" +
            "request%5BetcOptionList%5D%5B0%5D%5BfirstOption%5D=&" +
            "request%5BetcOptionList%5D%5B0%5D%5BsecondOption%5D=&" +
            "request%5BetcOptionList%5D%5B0%5D%5BminValue%5D=&" +
            "request%5BetcOptionList%5D%5B0%5D%5BmaxValue%5D=&" +
            "request%5BetcOptionList%5D%5B1%5D%5BfirstOption%5D=&" +
            "request%5BetcOptionList%5D%5B1%5D%5BsecondOption%5D=&" +
            "request%5BetcOptionList%5D%5B1%5D%5BminValue%5D=&" +
            "request%5BetcOptionList%5D%5B1%5D%5BmaxValue%5D=&" +
            "request%5BetcOptionList%5D%5B2%5D%5BfirstOption%5D=&" +
            "request%5BetcOptionList%5D%5B2%5D%5BsecondOption%5D=&" +
            "request%5BetcOptionList%5D%5B2%5D%5BminValue%5D=&" +
            "request%5BetcOptionList%5D%5B2%5D%5BmaxValue%5D=";
        ;
        return resultStr;
    }

    search(itemName, pageNo = 1) {
        this.lastfoundDataItemName = itemName;
        this.lastfoundDataPage = pageNo;

        let requestBody = this.#getRequestBody(itemName, pageNo);
        this.ItemSearchRequest.open("POST", this.url);
        this.ItemSearchRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        this.ItemSearchRequest.responseType = "text/html; charset=utf-8";
        this.ItemSearchRequest.send(requestBody);
    };
}