import { DynamoDB } from "aws-sdk"
import { v4 as uuid } from "uuid"

const db = new DynamoDB()

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
        body: JSON.stringify({
          success: false,
          error: "Invalid temperature",
        }),
        isBase64Encoded: false,
      }
    }

    await db.batchWriteItem({
      RequestItems: {
        [`${process.env.TABLE_NAME}`]: [{
          PutRequest: {
            Item: {
              id: { S: "current" },
              temperature: { N: temperature.toString() },
              date: { N: new Date().getTime().toString() },
            },
          }
        }, {
          PutRequest: {
            Item: {
              id: { S: uuid() },
              temperature: { N: temperature.toString() },
              date: { N: new Date().getTime().toString() },
            }
          }
        }],
      }
    }).promise()

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({
        success: true,
      }),
      isBase64Encoded: false,
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
        success: false,
        error: e,
      }),
      isBase64Encoded: false,
    }
  }
}