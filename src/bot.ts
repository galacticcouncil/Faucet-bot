import { Client, ClientOptions, Interaction } from 'discord.js'
import * as dotenv from 'dotenv'
import { BaseCommandInteraction } from 'discord.js'
import { Command } from './command'
import dripper from './dripper'

dotenv.config()

const token = process.env.TOKEN
const RPC = process.env.RPC_ENDPOINT
const key = process.env.FUNDING_KEY
const talkedRecently = new Set()

console.log('Bot is starting...')

const dripCommand: Command = {
  name: 'drip',
  description: 'Drips tokens from faucet',
  type: 'CHAT_INPUT',
  options: [
    {
      type: 'STRING',
      name: 'address',
      required: true,
      description: 'Address to which you want to receive tokens',
    },
  ],
  run: async (client: Client, interaction: BaseCommandInteraction) => {
    const address = interaction.options.get('address')?.value || null
    let content =
      address && typeof address === 'string'
        ? 'Successfully requested funding for ' + address
        : 'No address provided'

    console.log(interaction.user.id, 'requesting drip')

    if (talkedRecently.has(interaction.user.id)) {
      content = 'Please wait one day before asking for more tokens'
    } else if (address && typeof address === 'string') {
      const status = await dripper.drip(address)
      if (!status.success) {
        content = status.message
      } else {
        talkedRecently.add(interaction.user.id)
        setTimeout(() => {
          talkedRecently.delete(interaction.user.id)
        }, 24 * 60 * 60 * 1000)
      }
    }

    console.log(JSON.stringify(content))

    await interaction.followUp({
      content,
    })
  },
}

const client = new Client({
  intents: [],
})

client.on('ready', async () => {
  if (!client.user || !client.application || !RPC || !key) {
    return
  }

  await dripper.init(RPC, key).catch((error) => {
    console.log('API Initialization error', error)
  })

  await await client.application.commands.set([dripCommand])

  console.log(`${client.user.username} is online`)
})

client.on('interactionCreate', async (interaction: Interaction) => {
  if (interaction.isCommand() || interaction.isContextMenu()) {
    await handleSlashCommand(client, interaction)
  }
})

const handleSlashCommand = async (
  client: Client,
  interaction: BaseCommandInteraction,
): Promise<void> => {
  const slashCommand =
    dripCommand.name === interaction.commandName ? dripCommand : null
  if (!slashCommand) {
    interaction.followUp({ content: 'An error has occurred' })
    return
  }

  await interaction.deferReply()

  slashCommand.run(client, interaction)
}

client.login(token)
