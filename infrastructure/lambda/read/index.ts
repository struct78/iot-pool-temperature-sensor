import { DynamoDB } from "aws-sdk"

const db = new DynamoDB()
const unmarshall = DynamoDB.Converter.unmarshall

export const handler = async () => {
  try {
    const params = {
      TableName: `${process.env.TABLE_NAME}`,
      Limit: 1,
      ScanIndexForward: false,
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": { S: "current" },
      }
    }

    const result = await db.query(params).promise()
    const data = unmarshall(result.Items?.[0] ?? {})

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
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