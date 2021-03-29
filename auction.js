import XMLHttpRequest from 'xmlhttprequest';

export default class auction
{
    constructor() {
        this.http = new XMLHttpRequest.XMLHttpRequest();
        this.http.addEventListener("progress", this.#updateProgress);
        this.http.addEventListener("error", this.#transferFailed);
        this.http.addEventListener("abort", this.#transferCanceled);

        this.url = "https://m-lostark.game.onstove.com/Auction/GetAuctionList";
        this.result = "";
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

    #getRequestBody(itemName)
    {
        return "request%5BfirstCategory%5D=0&request%5BsecondCategory%5D=0&request%5BclassNo%5D=&request%5BitemTier%5D=&request%5BitemGrade%5D=&request%5BitemLevelMin%5D=0&request%5BitemLevelMax%5D=2000&request%5BitemName%5D=" + encodeURIComponent(itemName) + "&request%5BpageNo%5D=1&request%5BsortOption%5D%5BSort%5D=BIDSTART_PRICE&request%5BsortOption%5D%5BIsDesc%5D=false&request%5BgradeQuality%5D=&request%5BskillOptionList%5D%5B0%5D%5BfirstOption%5D=&request%5BskillOptionList%5D%5B0%5D%5BsecondOption%5D=&request%5BskillOptionList%5D%5B0%5D%5BminValue%5D=&request%5BskillOptionList%5D%5B0%5D%5BmaxValue%5D=&request%5BskillOptionList%5D%5B1%5D%5BfirstOption%5D=&request%5BskillOptionList%5D%5B1%5D%5BsecondOption%5D=&request%5BskillOptionList%5D%5B1%5D%5BminValue%5D=&request%5BskillOptionList%5D%5B1%5D%5BmaxValue%5D=&request%5BskillOptionList%5D%5B2%5D%5BfirstOption%5D=&request%5BskillOptionList%5D%5B2%5D%5BsecondOption%5D=&request%5BskillOptionList%5D%5B2%5D%5BminValue%5D=&request%5BskillOptionList%5D%5B2%5D%5BmaxValue%5D=&request%5BetcOptionList%5D%5B0%5D%5BfirstOption%5D=&request%5BetcOptionList%5D%5B0%5D%5BsecondOption%5D=&request%5BetcOptionList%5D%5B0%5D%5BminValue%5D=&request%5BetcOptionList%5D%5B0%5D%5BmaxValue%5D=&request%5BetcOptionList%5D%5B1%5D%5BfirstOption%5D=&request%5BetcOptionList%5D%5B1%5D%5BsecondOption%5D=&request%5BetcOptionList%5D%5B1%5D%5BminValue%5D=&request%5BetcOptionList%5D%5B1%5D%5BmaxValue%5D=&request%5BetcOptionList%5D%5B2%5D%5BfirstOption%5D=&request%5BetcOptionList%5D%5B2%5D%5BsecondOption%5D=&request%5BetcOptionList%5D%5B2%5D%5BminValue%5D=&request%5BetcOptionList%5D%5B2%5D%5BmaxValue%5D=";
    }

    search(itemName) {
        let requestBody = this.#getRequestBody(itemName);
        this.http.open("POST", this.url);
        this.http.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        this.http.responseType = "text/html; charset=utf-8";
        this.http.send(requestBody);
    };
}