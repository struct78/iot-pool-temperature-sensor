import { SecretsManager } from "aws-sdk"
import MYSQL from "mysql2"

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body)
    const temperature = parseFloat(body.temperature)

    if (isNaN(temperature)) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST",
        },
        body: {
          error: "Invalid temperature",
        },
      }
    }

    const result = await addRowToDatabase(temperature)
  
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify(result),
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({
        body: JSON.parse(event.body),
        e,
      }),
    }
  }
}

const addRowToDatabase = async (temperature: number) => {
  const secretsManager = new SecretsManager({
    region: process.env.AWS_REGION,
  })
  const secretValue = await secretsManager.getSecretValue({ SecretId: `${process.env.DB_SECRET_ARN}` }).promise()
  const databaseProps = JSON.parse(`${secretValue.SecretString}`)
  const { dbname, password, port, host, username } = databaseProps

  const pool = MYSQL.createConnection({
    user: username,
    database: dbname,
    password,
    port,
    host,
    ssl: "Amazon RDS",
    timezone: "Australia/Melbourne",
  })

  const result = await new Promise((resolve, reject) => {
    pool.query("INSERT INTO temperature.temperature_history (temperature, time) VALUES (?, ?)", [temperature, new Date()], (error) => {
      if (error) {
        return reject(error)
      }

      resolve({
        status: "success",
      })
    })
  })
  return result
}