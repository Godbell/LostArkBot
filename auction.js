import XMLHttpRequest from 'xmlhttprequest';
import nodeHtmlParser from "node-html-parser";
const {parse} = nodeHtmlParser;

import whManager from './WebhookManager.js';
const whm = new whManager();    // 웹훅 매니저

export default class auction
{
    constructor() {
        this.http = new XMLHttpRequest.XMLHttpRequest();
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

        this.http.addEventListener("load", () => {
            let responseHtmlString = this.http.responseText;
            let root = parse(responseHtmlString);

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
                let item = itemSlot[i];
                item = this.#decodeJsEscape(item);

                imgSrc[i] = imgSrc[i].toString().split('"')[1];
                let itemJson = JSON.parse(item);

                // ELEMENT 000: 공통, 아이템 이름
                let embed = {
                    color: '#0099ff',
                    title: nameData[i].innerText,    // 아이템 이름
                    thumbnail: { url: imgSrc[i] },
                    fields: [ ]
                };
                let tooltip = [];

                console.log(
                    aucData[i].childNodes[1].innerText.replace(/[^0-9]/gim, '')
                     + ", " + aucData[i].childNodes[3].innerText.replace(/[^0-9]/gim, '')
                     + ", " + aucData[i].childNodes[5].innerText.replace(/[^0-9]/gim, '')
                );

                embed['fields'].push({name: '거래 정보', value: countData[i].innerText, inline: true});
                embed['fields'].push({name: '티어 / 품질', value: gradeData[i].innerHTML.toString().split('<span>')[1].split('</span>')[0], inline: true});

                let effectDataStr = ""
                effectData[i].childNodes.forEach(child => {
                    effectDataStr += child.innerText + '\n'
                });
                embed['fields'].push({name: '효과', value: effectDataStr});

                embed['fields'].push({name: '남은 시간', value: timeData[i].textContent})
                embed['fields'].push({name: '현재 최고가', value: aucData[i].childNodes[1].innerText.replace(/[^0-9]/gim, ''), inline: true});
                if (embed['fields'][embed['fields'].length - 1]['value'].length == 0)
                    embed['fields'][embed['fields'].length - 1]['value'] = '-';
                embed['fields'].push({name: '최소 입찰가', value: aucData[i].childNodes[3].innerText.replace(/[^0-9]/gim, ''), inline: true});
                if (embed['fields'][embed['fields'].length - 1]['value'].length == 0)
                    embed['fields'][embed['fields'].length - 1]['value'] = '-';
                embed['fields'].push({name: '즉시 구매가', value: aucData[i].childNodes[5].innerText.replace(/[^0-9]/gim, ''), inline: true});
                if (embed['fields'][embed['fields'].length - 1]['value'].length == 0)
                    embed['fields'][embed['fields'].length - 1]['value'] = '-';
                console.log(JSON.stringify(embed));

                // Item ToolTip
                // ELEMENT 001: 공통, 등급 및 종류
                //tooltip.push({name: '등급', value: itemJson['Element_001']['value']['leftStr0'], inline: true});

                tooltip.push({name: '아이템 이름', value: itemJson['Element_000']['value']});
                let typeOfItem = itemJson['Element_001']['value']['leftStr0'].split(' ')[1];
                if (typeOfItem != '어빌리티') {
                    // 어빌리티 스톤은 품질 값이 없음
                    tooltip.push({name: '품질', value: itemJson['Element_001']['value']['qualityValue'], inline: true});
                }

                // ELEMENT 002: 무기/방어구에만 존재, 전용 직업
                if (typeOfItem != '어빌리티' && typeOfItem != '목걸이' && typeOfItem != '귀걸이' && typeOfItem != '반지' && typeOfItem != '힘을')
                {
                    tooltip.push({name: '직업', value: itemJson['Element_002']['value'], inline: true});
                }

                // ELEMENT 003: 공통, 거래 정보
                tooltip.push({name: '거래 정보', value: itemJson['Element_003']['value'], inline: true});

                // ELEMENT 004: 어빌리티 스톤과 무기/방어구는 기본 효과, 장신구는 단일 장착 가능 여부, 힘을 잃은 장비는 트라이포드 효과
                if (typeOfItem == '목걸이' || typeOfItem == '귀걸이' || typeOfItem == '반지')
                {
                    tooltip.push({name: '단일 장착 가능 여부', value: itemJson['Element_004']['value']});
                }
                else if (typeOfItem == '힘을')
                {
                    tooltip.push({name: '트라이포드 효과', value: itemJson['Element_004']['value']['Element_000']['contentStr']['Element_000']['contentStr'] + " / " + itemJson['Element_004']['value']['Element_000']['contentStr']['Element_001']['contentStr']});
                }
                else
                {
                    tooltip.push({name: '기본 효과', value: itemJson['Element_004']['value']['Element_001']})
                }

                // ELEMENT 005: 장신구는 기본 효과, 어빌리티 스톤은 무작위 각인 효과, 무기/방어구는 추가 효과, 힘을 잃은 장비는 설명
                // ELEMENT 006: 장신구는 추가 효과, 어빌리티 스톤은 세공 필요 메시지, 무기/방어구는 현재 단계 재련 경험치, 힘을 잃은 장비는 입수처
                // ELEMENT 007: 장신구는 무작위 각인 효과, 어빌리티 스톤은 제한사항, 무기/방어구는 트라이포드 효과, 힘을 잃은 장비는 내구도
                if (typeOfItem == '목걸이' || typeOfItem == '귀걸이' || typeOfItem == '반지')
                {
                    tooltip.push({name: '기본 효과', value: itemJson['Element_005']['value']['Element_001'], inline: true});
                    tooltip.push({name: '추가 효과', value: itemJson['Element_006']['value']['Element_001'], inline: true});
                    tooltip.push({name: '무작위 각인 효과', value: itemJson['Element_007']['value']['Element_001'], inline: true});
                }
                else if (typeOfItem == '어빌리티')
                {
                    tooltip.push({name: '무작위 각인 효과', value: itemJson['Element_005']['value']['Element_001']});
                    tooltip.push({name: '메시지', value: itemJson['Element_006']['value']});
                    tooltip.push({name: '제한 사항', value: itemJson['Element_007']['value']});
                }
                else if (typeOfItem == '힘을')
                {
                    tooltip.push({name: '설명', value: itemJson['Element_005']['value']});
                    tooltip.push({name: '입수처', value: itemJson['Element_006']['value']});
                    // 내구도 생략
                }
                else
                {
                    tooltip.push({name: '추가 효과', value: itemJson['Element_005']['value']['Element_001']});
                    //tooltip.push({name: '현재 단계 재련 경험치', value: itemJson['Element_006']['value']['value'] + " / " + itemJson['Element_006']['value']['maximum']});
                    tooltip.push({name: '트라이포드 효과', value: itemJson['Element_007']['value']['Element_000']['contentStr']['Element_000']['contentStr'] + " / " + itemJson['Element_007']['value']['Element_000']['contentStr']['Element_001']['contentStr']});
                }

                // ELEMENT 008: 장신구랑 무기/방어구는 품질 업그레이드 가능 여부, 어빌리티 스톤은 입수처
                if (typeOfItem != '힘을') {
                    if (typeOfItem != '어빌리티') {
                        tooltip.push({name: '품질 업그레이드 가능 여부', value: itemJson['Element_008']['value']});
                    } else {
                        tooltip.push({name: '입수처', value: itemJson['Element_008']['value']});
                    }

                    // ELEMENT 009: 장신구랑 무기/방어구는 입수처, 어빌리티 스톤에는 없음
                    if (typeOfItem != '어빌리티') {
                        tooltip.push({name: '입수처', value: itemJson['Element_009']['value']});
                    }
                }

                embeds['embeds'].push(embed);
            }

            whm.sendWebhook(
                this.lastEventMsg.channel.id,

                embeds);
        });
    }

    #updateProgress(oEvent)
    {
        if (oEvent.lengthComputable) {
            var percentComplete = oEvent.loaded / oEvent.total * 100;
            // ...
        } else {
            // Unable to compute progress information since the total size is unknown
        }
    }

    #transferComplete()
    {
        console.log("The transfer is complete.");
    }

    #transferFailed()
    {
        console.log("An error occurred while transferring the file.");
    }

    #transferCanceled()
    {
        console.log("The transfer has been canceled by the user.");
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
        this.http.open("POST", this.url);
        this.http.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        this.http.responseType = "text/html; charset=utf-8";
        this.http.send(requestBody);
    };

    #decodeJsEscape(str)
    {
        let resultStr = str.toString().replace(/&quot;/gi, '\"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .split(/"><img/)[0]
            .split(/data-item="/gi)[1]
            .replace(/<BR>/gi, ' / ')
            .replace(/(<([^>]+)>)/ig,"");
        return resultStr;
    }
}