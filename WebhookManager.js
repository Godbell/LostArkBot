import XMLHttpRequest from 'xmlhttprequest';
import fileStream from 'fs';
import Discord from "discord.js";

export default class WebhookManager {
    constructor() {
        this.regWebhook = null;
        this.registeringURL = null;
        this.webhookAvatar = "https://imgur.com/ytKaA6U";

        this.webhookRegisterHttp = new XMLHttpRequest.XMLHttpRequest();
        this.webhookRegisterHttp.addEventListener("load", () =>
        {
            let result = JSON.parse(this.webhookRegisterHttp.responseText);
            this.regWebhook['webhooks'].push(
                {
                    id: result['id'],
                    name: result['name'],
                    channel_id: result['channel_id'],
                    token: result['token'],
                    url: this.registeringURL
                }
            );
            fileStream.writeFile(
                './webhooks.json', JSON.stringify(this.regWebhook), 'utf8',
                (err) =>
                {
                    if (err) console.log(err);

                    else console.log(JSON.stringify(this.regWebhook));
                }
            );
        });

        this.webhookSenderHttp = new XMLHttpRequest.XMLHttpRequest();
        this.webhookSenderHttp.addEventListener("load", () =>
        {
            console.log(this.webhookSenderHttp.responseText);
        })

        fileStream.readFile(
            './webhooks.json',
            'utf8',
            (err, data) => {
                if (err) {
                    console.error(err)
                    return;
                }

                console.log(data);
                this.regWebhook = JSON.parse(data);
            }
        );
    }

    registerWebhook(webhookURL)
    {
        this.registeringURL = webhookURL;
        console.log(webhookURL);
        this.webhookRegisterHttp.open("GET", webhookURL);
        this.webhookRegisterHttp.send();
    }

    findWebhookWithChannelId(channelId) {
        for (let i = 0; i < this.regWebhook['webhooks'].length; i++) {
            if (this.regWebhook['webhooks'][i]['channel_id'] === channelId) {
                return this.regWebhook['webhooks'][i];
            }
        }

        return null;
    }

    sendWebhook(channel, sendingText, sendingObj) {
        console.log(channel);
        console.log(JSON.stringify(sendingObj));
        let targetWebhook = this.findWebhookWithChannelId(channel);

        if (targetWebhook == null) {
            console.log("no such channel found.");
            return;
        }

        const webhookClient = new Discord.WebhookClient(targetWebhook['id'], targetWebhook['token']);
        webhookClient.send(sendingText, sendingObj);
    }
}