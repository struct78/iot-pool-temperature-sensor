import MYSQL from "mysql2"
import { SecretsManager } from "aws-sdk"

type TemperatureHistory = {
  temperature: number
  time: string
}

export const handler = async (event: any) => {
  try {
    const result = await getLatestFromDatabase<TemperatureHistory[]>()
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(result?.[0]),
    }
  } catch (ex) {
    return {
      statusCode: 500,
      body: {
        error: ex,
      }
    }
  }
}

async function getLatestFromDatabase<T>(): Promise<T | undefined> {
  const secretsManager = new SecretsManager({
    region: process.env.AWS_REGION,
  })
  const secretValue = await secretsManager.getSecretValue({ SecretId: `${process.env.DB_SECRET_ARN}` }).promise()
  const databaseProps = JSON.parse(`${secretValue.SecretString}`)
  const { dbname, password, port, host, username } = databaseProps

  const connection = MYSQL.createConnection({
    user: username,
    database: dbname,
    password,
    port,
    host,
    ssl: "Amazon RDS",
  })

  const result = await new Promise<T>((resolve, reject) => {
    connection.query("SELECT temperature, time FROM temperature.temperature_history ORDER BY time DESC LIMIT 1", (error, results) => {
      connection.end()

      if (error) {
        return reject(error)
      }

      resolve(results as T)
    })
  })
  return result
}