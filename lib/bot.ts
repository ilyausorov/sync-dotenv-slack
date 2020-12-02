import { WebClient } from '@slack/web-api';
import { Token, Channel, IFile } from './models';
import Axios from 'axios';
import tempWrite from 'temp-write';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();
const {
  ENVBOT_SLACK_BOT_TOKEN: botToken,
  ENVBOT_SLACK_USER_TOKEN: userToken
} = process.env;

class SlackBot {
  web: WebClient;
  botToken: string;
  userToken: string;

  constructor(token: Token) {
    this.web = new WebClient(token.botToken);
    this.botToken = token.botToken;
    this.userToken = token.userToken;
  }

  async channels(): Promise<Channel[]> {
    const { channels } = await this.web.conversations.list({
      exclude_archived: true,
      types: 'public_channel,private_channel'
    });
    return channels as Channel[];
  }

  async channel(channelName: string): Promise<Channel> {
    const channels = await this.channels();
    return channels.filter(channel => channel.name === channelName)[0];
  }

  async deleteFile(fileId: string) {
    return await this.web.files.delete({
      token: this.userToken,
      file: fileId
    });
  }

  async latestFile(channel: Channel, filename: string): Promise<IFile | null> {
    const { user_id: SLACK_BOT_ID } = await this.web.auth.test();
    const { files } = await this.web.files.list({
      channel: channel.id,
      user: `${SLACK_BOT_ID}`,
      count: 100,
      token: this.userToken
    });
    console.log("filename", filename)
    const listWithMatchingFileName = files.length && files.filter(i => i.name === filename)
    console.log("listWithMatchingFileName", listWithMatchingFileName.length)
    const lastElement = listWithMatchingFileName.length && listWithMatchingFileName.splice(listWithMatchingFileName.length - 1, 1)
    console.log("lastElement", lastElement)
    await Promise.all(listWithMatchingFileName.map(async (i) => {
      return deleteFile(i.id)
    }))
    return lastElement.length ? lastElement[0] : null;
  }

  async fileContents(file: IFile) {
    const { data } = await Axios.get(file.url_private, {
      headers: {
        Authorization: `Bearer ${this.botToken}`
      }
    });
    return data;
  }

  async upload(env: string, channel: Channel, filename: string) {
    return tempWrite(env).then(filePath => {
      const file = readFileSync(filePath);
      return this.web.files.upload({
        filename: filename,
        file,
        channels: channel.name
      });
    });
  }
}

export default new SlackBot({ botToken, userToken });
