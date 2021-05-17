import Discord from 'discord.js';
import XMLHttpRequest from 'xmlhttprequest';
import nodeHtmlParser from "node-html-parser";
const {parse} = nodeHtmlParser;
import fileStream from 'fs';

import whManager from './WebhookManager.js';
import lzString from 'lz-string';
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

        this.url = "https://m-lostark.game.onstove.com/Auction/GetAuctionListV2";
        this.nextPageEmoji = ':arrow_forward:';
        this.prevPageEmoji = ':arrow_backward:';
        this.firstPageEmoji = ':track_previous:';
        this.lastPageEmoji = ':track_next:';
        this.prev10PagesEmoji = ':rewind:';
        this.next10PagesEmoji = ':fast_forward:';
        this.itemTooltipHTMLTemplate = '';

        this.ItemSearchRequest.addEventListener("load", () => {
            let responseHtmlString = this.ItemSearchRequest.responseText;
            console.log(responseHtmlString);
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

            let embeds = {
                "embeds": []
            };

            console.log(itemSlot);
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
                let tooltipSlot =
                {
                    tooltip: []
                };

                // Item ToolTip
                // ELEMENT 001: 공통, 등급 및 종류
                //tooltipSlot.tooltip.push({name: '등급', value: itemJson['Element_001']['value']['leftStr0'], inline: true});

                tooltipSlot.tooltip.push({name: '아이템 이름', value: itemJson['Element_000']['value']});
                let typeOfItem = itemJson['Element_001']['value']['leftStr0'];
                tooltipSlot.tooltip.push({name: '아이템 종류', value: itemJson['Element_001']['value']['leftStr0']})

                if (!typeOfItem.includes('어빌리티')) {
                    // 어빌리티 스톤은 품질, 아이템 레벨 값이 없음
                    tooltipSlot.tooltip.push({name: '품질', value: itemJson['Element_001']['value']['qualityValue'], inline: true});
                    tooltipSlot.tooltip.push({name: '아이템 레벨', value: itemJson['Element_001']['value']['leftStr2']});
                }

                ////

                // ELEMENT 002: 무기/방어구 및 힘을 잃은 장비에만 존재, 전용 직업
                if (!typeOfItem.includes( '어빌리티')
                    && !typeOfItem.includes( '목걸이')
                    && !typeOfItem.includes( '귀걸이')
                    && !typeOfItem.includes( '반지')
                    && !typeOfItem.includes( '힘을'))
                {
                    tooltipSlot.tooltip.push({name: '전용 직업', value: itemJson['Element_002']['value'], inline: true});
                }
                else if (typeOfItem.includes( '힘을'))
                {
                    tooltipSlot.tooltip.push({name: '전용 직업', value: itemJson['Element_002']['value'], inline: true});
                }

                // ELEMENT 003: 공통, 거래 정보
                tooltipSlot.tooltip.push({name: '거래 정보', value: itemJson['Element_003']['value'], inline: true});

                // ELEMENT 004: 어빌리티 스톤과 무기/방어구는 기본 효과, 장신구는 단일 장착 가능 여부, 힘을 잃은 장비는 트라이포드 효과
                if (typeOfItem.includes( '목걸이')
                    || typeOfItem.includes( '귀걸이')
                    || typeOfItem.includes('반지'))
                {
                    tooltipSlot.tooltip.push({name: '단일 장착 가능 여부', value: itemJson['Element_004']['value']});
                }
                else if (typeOfItem.includes( '힘을'))
                {
                    tooltipSlot.tooltip.push({name: '트라이포드 효과', value: ""});
                    for(let j = 0 ; j < 999 ; j++) {
                        if (itemJson['Element_004']['value']['Element_000']['contentStr']['Element_' + j.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})]
                            != undefined) {
                            tooltipSlot.tooltip[tooltipSlot.tooltip.length - 1]['value'] +=
                                itemJson['Element_004']['value']['Element_000']['contentStr']['Element_' + j.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})]['contentStr']
                                + ',';
                        } else break;
                    }
                }
                else
                {
                    tooltipSlot.tooltip.push({name: '기본 효과', value: itemJson['Element_004']['value']['Element_001']});
                }

                // ELEMENT 005: 장신구는 기본 효과, 어빌리티 스톤은 무작위 각인 효과, 무기/방어구는 추가 효과, 힘을 잃은 장비는 설명
                // ELEMENT 006: 장신구는 추가 효과, 어빌리티 스톤은 세공 필요 메시지, 무기/방어구는 현재 단계 재련 경험치, 힘을 잃은 장비는 입수처
                // ELEMENT 007: 장신구는 무작위 각인 효과, 어빌리티 스톤은 제한사항, 무기/방어구는 트라이포드 효과, 힘을 잃은 장비는 내구도
                if (typeOfItem.includes( '목걸이')
                    || typeOfItem.includes( '귀걸이')
                    || typeOfItem.includes('반지'))
                {
                    tooltipSlot.tooltip.push({name: '기본 효과', value: itemJson['Element_005']['value']['Element_001'], inline: true});
                    tooltipSlot.tooltip.push({name: '추가 효과', value: itemJson['Element_006']['value']['Element_001'], inline: true});
                    tooltipSlot.tooltip.push({name: '무작위 각인 효과', value: itemJson['Element_007']['value']['Element_001'], inline: true});
                }
                else if (typeOfItem.includes( '어빌리티'))
                {
                    tooltipSlot.tooltip.push({name: '무작위 각인 효과', value: itemJson['Element_005']['value']['Element_001']});
                    tooltipSlot.tooltip.push({name: '메시지', value: itemJson['Element_006']['value']});
                    tooltipSlot.tooltip.push({name: '제한 사항', value: itemJson['Element_007']['value']});
                }
                else if (typeOfItem.includes( '힘을'))
                {
                    tooltipSlot.tooltip.push({name: '설명', value: itemJson['Element_005']['value']});
                    tooltipSlot.tooltip.push({name: '입수처', value: itemJson['Element_006']['value']});
                    tooltipSlot.tooltip.push({name: '내구도', value: itemJson['Element_007']['value']});
                }
                else
                {
                    tooltipSlot.tooltip.push({name: '추가 효과', value: itemJson['Element_005']['value']['Element_001']});
                    tooltipSlot.tooltip.push({name: '현재 단계 재련 경험치', value: itemJson['Element_006']['value']['value'] + " / " + itemJson['Element_006']['value']['maximum']});
                    tooltipSlot.tooltip.push({name: '트라이포드 효과', value: ""});
                    for(let j = 0 ; j < 999 ; j++) {
                        if (itemJson['Element_007']['value']['Element_000']['contentStr']['Element_' + j.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})]
                            != undefined) {
                            tooltipSlot.tooltip[tooltipSlot.tooltip.length - 1]['value'] +=
                                itemJson['Element_007']['value']['Element_000']['contentStr']['Element_' + j.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})]['contentStr']
                            + ',';
                        } else break;
                    }
                }

                // ELEMENT 008: 장신구랑 무기/방어구는 품질 업그레이드 가능 여부, 어빌리티 스톤은 입수처
                if (!typeOfItem.includes( '힘을')) {
                    if (!typeOfItem.includes( '어빌리티')) {
                        tooltipSlot.tooltip.push({name: '품질 업그레이드 가능 여부', value: itemJson['Element_008']['value']});
                    } else {
                        tooltipSlot.tooltip.push({name: '입수처', value: itemJson['Element_008']['value']});
                    }

                    // ELEMENT 009: 장신구랑 무기/방어구는 입수처, 어빌리티 스톤에는 없음
                    if (!typeOfItem.includes( '어빌리티')) {
                        tooltipSlot.tooltip.push({name: '입수처', value: itemJson['Element_009']['value']});
                    }

                    if (!typeOfItem.includes('어빌리티'))
                    {
                        tooltipSlot.tooltip.push({name: '내구도', value: itemJson['Element_010']['value']});
                    }
                }

                imgSrc[i] = imgSrc[i].toString().split('"')[1];
                tooltipSlot.tooltip.push({name: '아이템 이미지', value: imgSrc[i]});

                // ELEMENT 000: 공통, 아이템 이름
                let embed = {
                    color: '#0099ff',
                    url: '',
                    title: nameData[i].innerText,    // 아이템 이름
                    thumbnail: { url: imgSrc[i] },
                    fields: [ ]
                };

                console.log('###');
                console.log('http://localhost:3000/api/LostArk/itemToolTip?Item-Json='
                    + lzString.compressToEncodedURIComponent(JSON.stringify(tooltipSlot)));
                embed['url'] = 'http://localhost:3000/api/LostArk/itemToolTip?Item-Json='
                    + lzString.compressToEncodedURIComponent(JSON.stringify(tooltipSlot));

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

            whm.sendWebhook(
                this.lastEventMsg.channel.id,

                embeds);

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