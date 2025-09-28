# 🚀 Discord Bot Deployment Guide

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **Discord Bot Token** (from Discord Developer Portal)
3. **Server Access** (VPS, cloud service, or local machine)

## 🔧 Setup Instructions

### 1. Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file with your actual values:**
   ```bash
   nano .env  # or use your preferred editor
   ```

3. **Fill in the required values:**
   ```env
   token=YOUR_ACTUAL_BOT_TOKEN
   CHANNEL_ID=YOUR_CHANNEL_ID
   GUILD_ID=YOUR_GUILD_ID
   USER_ID=YOUR_USER_ID
   ```

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy Slash Commands

```bash
node deploy-cmd.js
```

### 4. Start the Bot

```bash
# Development
npm start

# Production (with PM2)
pm2 start index.js --name "chatmandu-bot"
```

## 🔒 Security Best Practices

### ✅ DO:
- Keep your `.env` file private
- Use environment variables for all sensitive data
- Regularly rotate your bot token
- Use a process manager like PM2 for production
- Monitor bot logs for errors

### ❌ DON'T:
- Commit `.env` file to version control
- Share your bot token publicly
- Run the bot as root user
- Ignore security updates

## 🌐 Production Deployment

### Using PM2 (Recommended)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Start the bot:**
   ```bash
   pm2 start index.js --name "chatmandu-bot"
   ```

3. **Save PM2 configuration:**
   ```bash
   pm2 save
   pm2 startup
   ```

4. **Monitor the bot:**
   ```bash
   pm2 status
   pm2 logs chatmandu-bot
   ```

### Using Docker (Alternative)

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 3000
   CMD ["node", "index.js"]
   ```

2. **Build and run:**
   ```bash
   docker build -t chatmandu-bot .
   docker run -d --name chatmandu-bot --env-file .env chatmandu-bot
   ```

## 📊 Monitoring

### Health Checks
- Bot responds to `/ping` command
- Election system loads successfully
- Auto-save functionality works

### Logs to Monitor
- Bot login status
- Command execution errors
- Election system errors
- Memory usage

## 🔄 Updates

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Install new dependencies:**
   ```bash
   npm install
   ```

3. **Deploy new commands (if any):**
   ```bash
   node deploy-cmd.js
   ```

4. **Restart the bot:**
   ```bash
   pm2 restart chatmandu-bot
   ```

## 🆘 Troubleshooting

### Common Issues

1. **Bot not responding:**
   - Check if token is correct
   - Verify bot has proper permissions
   - Check network connectivity

2. **Commands not working:**
   - Run `node deploy-cmd.js` to register commands
   - Check bot permissions in Discord server

3. **Election system errors:**
   - Check file permissions for `election_data.json`
   - Verify environment variables are set

### Support
- Check logs: `pm2 logs chatmandu-bot`
- Restart bot: `pm2 restart chatmandu-bot`
- Check status: `pm2 status`
