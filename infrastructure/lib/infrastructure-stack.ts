import { TypeScriptCode } from "@mrgrain/cdk-esbuild"
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib"
import { ApiKey, ApiKeySourceType, CfnStage, Cors, DomainName, EndpointType, LambdaIntegration, RestApi, SecurityPolicy } from "aws-cdk-lib/aws-apigateway"
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager"
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb"
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam"
import { Function, Runtime } from "aws-cdk-lib/aws-lambda"
import { LogGroup } from "aws-cdk-lib/aws-logs"
import { ARecord, CnameRecord, PublicHostedZone, RecordTarget } from "aws-cdk-lib/aws-route53"
import { ApiGatewayDomain } from "aws-cdk-lib/aws-route53-targets"
import { Secret } from "aws-cdk-lib/aws-secretsmanager"
import { Construct } from "constructs"
import config from "../../config.json"

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const { domainName } = config

    // 1. Create DNS Zone
    const hostedZone = new PublicHostedZone(this, "temperature-hosted-zone", {
      zoneName: domainName,
    })
  
    hostedZone.applyRemovalPolicy(RemovalPolicy.DESTROY)


    // 2. Create certificate
    const certificate = new Certificate(this, "temperature-certificate", {
      domainName,
      subjectAlternativeNames: [`api.${domainName}`, `www.${domainName}`],
      validation: CertificateValidation.fromDns(hostedZone),
    })

    certificate.applyRemovalPolicy(RemovalPolicy.DESTROY)

    // 3. Infrastructure
    const table = new Table(this, "temperature-history", { 
      partitionKey: { name: "id", type: AttributeType.STRING }, 
      billingMode: BillingMode.PROVISIONED, 
    })

    const readLambda = new Function(this, "temperature-lambda-read", {
      functionName: "temperature-read",
      runtime: Runtime.NODEJS_16_X,
      code: new TypeScriptCode("./lambda/read/index.ts"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: table.tableName,
      },
      timeout: Duration.seconds(30),
    })

    const writeLambda = new Function(this, "temperature-lambda-write", {
      functionName: "temperature-write",
      runtime: Runtime.NODEJS_16_X,
      code: new TypeScriptCode("./lambda/write/index.ts"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: table.tableName,
      },
    })

    const readPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["dynamodb:Query"],
      resources: [table.tableArn]
    })

    const writePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["dynamodb:PutItem", "dynamodb:BatchWriteItem"],
      resources: [table.tableArn]
    })

    writeLambda.addToRolePolicy(writePolicy)
    readLambda.addToRolePolicy(readPolicy)
    
    // API Gateway
    const readGateway = new RestApi(this, "temperature-api-gateway-read", {
      cloudWatchRole: true,
      restApiName: "temperature-api-gateway-read",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
      },
    })

    const writeGateway = new RestApi(this, "temperature-api-gateway-write", {
      cloudWatchRole: true,
      restApiName: "temperature-api-gateway-write",
      apiKeySourceType: ApiKeySourceType.HEADER,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
      },
    })

    const readIntegration = new LambdaIntegration(readLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' },
    })

    const writeIntegration = new LambdaIntegration(writeLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' },
    })
    
    const readResource = readGateway.root.addResource("read")
    const writeResource = writeGateway.root.addResource("write")

    readResource.addMethod("GET", readIntegration)
    writeResource.addMethod("POST", writeIntegration, { 
      apiKeyRequired: true,
      requestParameters: {
        "method.request.header.x-api-key": true,
      },
    })

    // We want to protect the write endpoint with an API key to prevent abuse
    const apiKeySecret = new Secret(this, "temperature-api-key-secret", {
      generateSecretString: {
        generateStringKey: "key",
        secretStringTemplate: "{}",
        passwordLength: 30,
        excludeCharacters: " =-.^,\\%+~`#$&*()|[]{}:;<>?!'/@\""
      },
    })
  
    const usagePlan = writeGateway.addUsagePlan("temperature-write-usage-plan", {
      name: "temperature-write-usage-plan",
      apiStages: [{ api: writeGateway, stage: writeGateway.deploymentStage }],
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
    })

    const apiKey = new ApiKey(this, "temperature-write-api-key", {
      apiKeyName: "api-key",
      enabled: true,
      value: apiKeySecret.secretValueFromJson("key").unsafeUnwrap(),
      stages: [writeGateway.deploymentStage]
    })

    usagePlan.addApiKey(apiKey)

    const readStage = readGateway.deploymentStage.node.defaultChild as CfnStage
    const writeStage = readGateway.deploymentStage.node.defaultChild as CfnStage

    const readLogGroup = new LogGroup(readGateway, "temperature-api-gateway-read-logs", {
      retention: 90,
    })

    const writeLogGroup = new LogGroup(writeGateway, "temperature-api-gateway-write-logs", {
      retention: 90,
    })

    const logFormat = JSON.stringify({
      requestId: "$context.requestId",
      userAgent: "$context.identity.userAgent",
      sourceIp: "$context.identity.sourceIp",
      requestTime: "$context.requestTime",
      httpMethod: "$context.httpMethod",
      path: "$context.path",
      status: "$context.status",
      responseLength: "$context.responseLength",
    })

    readStage.accessLogSetting = {
      destinationArn: readLogGroup.logGroupArn,
      format: logFormat,
    }

    writeStage.accessLogSetting = {
      destinationArn: writeLogGroup.logGroupArn,
      format: logFormat,
    }

    readLogGroup.grantWrite(new ServicePrincipal("apigateway.amazonaws.com"))
    writeLogGroup.grantWrite(new ServicePrincipal("apigateway.amazonaws.com"))


    const subdomain = new DomainName(this, "temperature-api-subdomain", {
      domainName: `api.${domainName}`,
      certificate: certificate,
      endpointType: EndpointType.REGIONAL,
      securityPolicy: SecurityPolicy.TLS_1_2,
    })

    new ARecord(this, "temperature-vercel-a-record", {
      zone: hostedZone,
      target: RecordTarget.fromIpAddresses("76.76.21.21"),
    })

    new CnameRecord(this, "temperature-vercel-cname", {
      zone: hostedZone,
      recordName: "www",
      domainName: "cname.vercel-dns.com"
    })

    new ARecord(this, "temperature-api-a-record", {
      zone: hostedZone,
      recordName: `api.${domainName}`,
      target: RecordTarget.fromAlias(new ApiGatewayDomain(subdomain))
    })

    subdomain.addApiMapping(readGateway.deploymentStage, { basePath: "app" })
    subdomain.addApiMapping(writeGateway.deploymentStage, { basePath: "arduino" })

    // Output API URL
    new CfnOutput(this, "temperature-outputs-hosted-zone", {
      value: hostedZone.hostedZoneArn,
      exportName: "hostedZone",
    })
    
    new CfnOutput(this, "temperature-outputs-certificate", {
      value: certificate.certificateArn,
      exportName: "certificate",
    })
    
    new CfnOutput(this, "temperature-outputs-read-api-url", {
      value: readGateway.arnForExecuteApi(),
      exportName: "read-api-url",
    })
  }
}