// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActionTypes, ActivityTypes, CardFactory } = require('botbuilder');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

/**
 * A bot that is able to send and receive attachments.
 */
class AttachmentsBot {
    /**
     * Every conversation turn for our AttachmentsBot will call this method.
     * There are no dialogs used, since it's "single turn" processing, meaning a single
     * request and response, with no stateful conversation.
     * @param turnContext A TurnContext instance containing all the data needed for processing this conversation turn.
     */
    async onTurn(turnContext) {
        if (turnContext.activity.type === ActivityTypes.Message) {
            // Determine how the bot should process the message by checking for attachments.
            if (turnContext.activity.attachments && turnContext.activity.attachments.length > 0) {
                // The user sent an attachment and the bot should handle the incoming attachment.
                await this.handleIncomingAttachment(turnContext);
            } else {
                // Since no attachment was received, send an attachment to the user.
                await this.handleOutgoingAttachment(turnContext);
            }

            // Send a HeroCard with potential options for the user to select.
        
        } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate &&
            turnContext.activity.recipient.id !== turnContext.activity.membersAdded[0].id) {
            // If the Activity is a ConversationUpdate, send a greeting message to the user.
            await turnContext.sendActivity('Mi nombre es BotinEjemplo, estoy a tus ordenes ');
           

            // Send a HeroCard with potential options for the user to select.
            await this.displayOptions(turnContext);
        } else if (turnContext.activity.type !== ActivityTypes.ConversationUpdate) {
            // Respond to all other Activity types.
            await turnContext.sendActivity(`[${ turnContext.activity.type }]-type activity detected.`);
        }
    }

    /**
     * Saves incoming attachments to disk by calling `this.downloadAttachmentAndWrite()` and
     * responds to the user with information about the saved attachment or an error.
     * @param {Object} turnContext
     */
    async handleIncomingAttachment(turnContext) {
        // Prepare Promises to download each attachment and then execute each Promise.
        const promises = turnContext.activity.attachments.map(this.downloadAttachmentAndWrite);
        const successfulSaves = await Promise.all(promises);

        // Replies back to the user with information about where the attachment is stored on the bot's server,
        // and what the name of the saved file is.
        async function replyForReceivedAttachments(localAttachmentData) {
            if (localAttachmentData) {
                // Because the TurnContext was bound to this function, the bot can call
                // `TurnContext.sendActivity` via `this.sendActivity`;
                await this.sendActivity(`Attachment "${ localAttachmentData.fileName }" ` +
                    `has been received and saved to "${ localAttachmentData.localPath }".`);
            } else {
                await this.sendActivity('Attachment was not successfully saved to disk.');
            }
        }

        // Prepare Promises to reply to the user with information about saved attachments.
        // The current TurnContext is bound so `replyForReceivedAttachments` can also send replies.
        const replyPromises = successfulSaves.map(replyForReceivedAttachments.bind(turnContext));
        await Promise.all(replyPromises);
    }

    /**
     * Downloads attachment to the disk.
     * @param {Object} attachment
     */
    async downloadAttachmentAndWrite(attachment) {
        // Retrieve the attachment via the attachment's contentUrl.
        const url = attachment.contentUrl;

        // Local file path for the bot to save the attachment.
        const localFileName = path.join(__dirname, attachment.name);

        try {
            // arraybuffer is necessary for images
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            // If user uploads JSON file, this prevents it from being written as "{"type":"Buffer","data":[123,13,10,32,32,34,108..."
            if (response.headers['content-type'] === 'application/json') {
                response.data = JSON.parse(response.data, (key, value) => {
                    return value && value.type === 'Buffer' ?
                      Buffer.from(value.data) :
                      value;
                    });
            }
            fs.writeFile(localFileName, response.data, (fsError) => {
                if (fsError) {
                    throw fsError;
                }
            });
        } catch (error) {
            console.error(error);
            return undefined;
        }
        // If no error was thrown while writing to disk, return the attachment's name
        // and localFilePath for the response back to the user.
        return {
            fileName: attachment.name,
            localPath: localFileName
        };
    }

    /**
     * Responds to user with either an attachment or a default message indicating
     * an unexpected input was received.
     * @param {Object} turnContext
     */
    async handleOutgoingAttachment(turnContext) {
        const reply = { type: ActivityTypes.Message };

        // Look at the user input, and figure out what type of attachment to send.
        // If the input matches one of the available choices, populate reply with
        // the available attachments.
        // If the choice does not match with a valid choice, inform the user of
        // possible options.
        const firstChar = turnContext.activity.text;
        if (firstChar === 'hola') {
            reply.text = 'hola, espero que este teniendo un buen dia';
            reply.attachments = [this.getInlineAttachment()];
            await this.displayOptions(turnContext);


        } else if (firstChar === '1') {
            await this.displayOptions2(turnContext);
            reply.attachments = [this.getInternetAttachmentRedes()];
            reply.text = 'Aqui se muestran las redes sociales';
            
            
        }else if (firstChar === '2') {
            reply.attachments = [this. getInternetAttachmentEmp()];
            reply.text = 'A qui se muestra la informacion de la empresa ';
        } else if (firstChar === '3') {
             reply.attachments = [this. getInternetAttachmentHora()];
             reply.text = 'A qui se muesta los horarios de atencion a clientes .';
        } else {
            // The user did not enter input that this bot was built to handle.
             reply.text = 'lo siento no entiendo lo que dices ';
        }
        await turnContext.sendActivity(reply);
    }

    /**
     * Sends a HeroCard with choices of attachments.
     * @param {Object} turnContext
     */
    async displayOptions(turnContext) {
        const reply = { type: ActivityTypes.Message };

        // Note that some channels require different values to be used in order to get buttons to display text.
        // In this code the emulator is accounted for with the 'title' parameter, but in other channels you may
        // need to provide a value for other parameters like 'text' or 'displayText'.
        const buttons = [
            { type: ActionTypes.ImBack, title: '1. Redes sociales', value: '1' },
            { type: ActionTypes.ImBack, title: '2. Informacion de la empresa ', value: '2' },
            { type: ActionTypes.ImBack, title: '3. Horarios', value: '3' }
        ];

        const card = CardFactory.heroCard('', undefined,
            buttons, { text: 'Elije la opcion que desees consultar por favor ' });

        reply.attachments = [card];

        await turnContext.sendActivity(reply);
    }
    async displayOptions2(turnContext) {
        const reply = { type: ActivityTypes.Message };

        // Note that some channels require different values to be used in order to get buttons to display text.
        // In this code the emulator is accounted for with the 'title' parameter, but in other channels you may
        // need to provide a value for other parameters like 'text' or 'displayText'.
        const buttons = [
            { type: ActionTypes.ImBack, title: '1. Facebook', value: 'www.facebok.com' },
            { type: ActionTypes.ImBack, title: '2. Twitter', value: 'www.Twitter.com' },
            { type: ActionTypes.ImBack, title: '3. Youtube', value: 'www.Youtube.com' }
        ];

        const card2 = CardFactory.heroCard('', undefined,
            buttons, { text: 'Selecciona la red social que desees consultar' });
            reply.attachments = [card2];

        

        await turnContext.sendActivity(reply);
    }

    /**
     * Returns an inline attachment.
     */
    getInlineAttachment() {
        const imageData = fs.readFileSync(path.join(__dirname, '/resources/hola_032.jpg'));
        const base64Image = Buffer.from(imageData).toString('base64');

        return {
            name: 'architecture-resize.png',
            contentType: 'image/png',
            contentUrl: `data:image/png;base64,${ base64Image }`
        };
    }

    /**
     * Returns an attachment to be sent to the user from a HTTPS URL.
     */
    getInternetAttachment() {
        // NOTE: The contentUrl must be HTTPS.
        return {
            name: 'architecture-resize.png',
            contentType: 'image/png',
            contentUrl: 'https://img.imagenescool.com/ic/hola/hola_032.jpg'
        };
    }
    getInternetAttachmentRedes() {
        // NOTE: The contentUrl must be HTTPS.
        return {
            name: 'architecture-resize.png',
            contentType: 'image/png',
            contentUrl: 'http://www.telam.com.ar/advf/imagenes/2017/11/5a0c4c77de733_645x362.jpg'
        };
    }
    getInternetAttachmentHora() {
        // NOTE: The contentUrl must be HTTPS.
        return {
            name: 'architecture-resize.png',
            contentType: 'image/png',
            contentUrl: 'http://www.uneve.edu.mx/alumnos/PDF/horarios/horarios.jpg'
        };
    }
    getInternetAttachmentEmp() {
        // NOTE: The contentUrl must be HTTPS.
        return {
            name: 'architecture-resize.png',
            contentType: 'image/png',
            contentUrl: 'https://e.rpp-noticias.io/normal/2016/09/26/111411_252455.png'
        };
    }


    /**
     * Returns an attachment that has been uploaded to the channel's blob storage.
     * @param {Object} turnContext
     */
    async getUploadedAttachment(turnContext) {
        const imageData = fs.readFileSync(path.join(__dirname, '/resources/architecture-resize.png'));
        const connector = turnContext.adapter.createConnectorClient(turnContext.activity.serviceUrl);
        const conversationId = turnContext.activity.conversation.id;
        const response = await connector.conversations.uploadAttachment(conversationId, {
            name: 'architecture-resize.png',
            originalBase64: imageData,
            type: 'image/png'
        });

        // Retrieve baseUri from ConnectorClient for... something.
        const baseUri = connector.baseUri;
        const attachmentUri = baseUri + (baseUri.endsWith('/') ? '' : '/') + `v3/attachments/${ encodeURI(response.id) }/views/original`;
        return {
            name: 'architecture-resize.png',
            contentType: 'image/png',
            contentUrl: attachmentUri
        };
    }
}

exports.AttachmentsBot = AttachmentsBot;
