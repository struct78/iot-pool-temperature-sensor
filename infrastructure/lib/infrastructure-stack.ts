import { TypeScriptCode } from "@mrgrain/cdk-esbuild"
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib"
import { ApiKey, ApiKeySourceType, CfnStage, Cors, DomainName, EndpointType, LambdaIntegration, RestApi, SecurityPolicy } from "aws-cdk-lib/aws-apigateway"
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager"
import { AllowedMethods, CachePolicy, Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront"
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins"
import { InstanceClass, InstanceSize, InstanceType, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2"
import { ServicePrincipal } from "aws-cdk-lib/aws-iam"
import { Function, Runtime } from "aws-cdk-lib/aws-lambda"
import { LogGroup } from "aws-cdk-lib/aws-logs"
import { Credentials, DatabaseInstance, DatabaseInstanceEngine } from "aws-cdk-lib/aws-rds"
import { ARecord, AaaaRecord, PublicHostedZone, RecordTarget } from "aws-cdk-lib/aws-route53"
import { ApiGatewayDomain, CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets"
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3"
import { BucketDeployment, CacheControl, Source } from "aws-cdk-lib/aws-s3-deployment"
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
    const vpc = new Vpc(this, "temperature-vpc", { 
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "privateLambda",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: "public",
          subnetType: SubnetType.PUBLIC,
        },
      ],
    })

    const databaseSecurityGroup = new SecurityGroup(this, "temperature-db-security-group", {
      vpc,
    })

    const databaseName = "temperature"

    const database = new DatabaseInstance(this, "temperature-rds", {
      engine: DatabaseInstanceEngine.MYSQL,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO),
      vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: SubnetType.PUBLIC,
      }),
      allocatedStorage: 10,
      deletionProtection: false,
      credentials: Credentials.fromGeneratedSecret("temperaturedb"),
      removalPolicy: RemovalPolicy.DESTROY,
      databaseName,
      publiclyAccessible: false,
      securityGroups: [databaseSecurityGroup],
    })

    const lambdaSecurityGroup = new SecurityGroup(this, "temperature-lambda-security-group", {
      vpc,
    });

    const readLambda = new Function(this, "temperature-lambda-read", {
      functionName: "temperature-read",
      runtime: Runtime.NODEJS_16_X,
      code: new TypeScriptCode("./lambda/read/index.ts"),
      handler: "index.handler",
      vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      }),
      securityGroups: [lambdaSecurityGroup],
      environment: {
        DB_ENDPOINT_ADDRESS: database.dbInstanceEndpointAddress,
        DB_NAME: databaseName,
        DB_SECRET_ARN: `${database.secret?.secretFullArn}`,
      },
      timeout: Duration.seconds(30),
    })

    const writeLambda = new Function(this, "temperature-lambda-write", {
      functionName: "temperature-write",
      runtime: Runtime.NODEJS_16_X,
      code: new TypeScriptCode("./lambda/write/index.ts"),
      handler: "index.handler",
      vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      }),
      securityGroups: [lambdaSecurityGroup],
      environment: {
        DB_ENDPOINT_ADDRESS: database.dbInstanceEndpointAddress,
        DB_NAME: databaseName,
        DB_SECRET_ARN: `${database.secret?.secretFullArn}`,
      }
    })

    database.secret?.grantRead(writeLambda)
    database.secret?.grantRead(readLambda)
    
    databaseSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      Port.tcp(3306),
      "Lambda to MySQL database",
    );
    
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

    // App hosting
    const assetsBucket = new Bucket(this, "temperature-app-bucket", {
      autoDeleteObjects: true,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    // Create S3 bucket
    const assetsBucketS3Origin = new S3Origin(assetsBucket)

    // Create Cloudfront distribution
    const distribution = new Distribution(this, "temperature-app-distribution", {
      defaultBehavior: {
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        origin: assetsBucketS3Origin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
      domainNames: [domainName, `www.${domainName}`],
      certificate,
    })

    // Connect cloudfront to A record
    new ARecord(this, "temperature-a-record", {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    })

    // Connect cloudfront to AAAA record
    new AaaaRecord(this, "temperature-aaaa-record", {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    })

    const subdomain = new DomainName(this, "temperature-api-subdomain", {
      domainName: `api.${domainName}`,
      certificate: certificate,
      endpointType: EndpointType.REGIONAL,
      securityPolicy: SecurityPolicy.TLS_1_2,
    })

    new ARecord(this, "temperature-api-a-record", {
      zone: hostedZone,
      recordName: `api.${domainName}`,
      target: RecordTarget.fromAlias(new ApiGatewayDomain(subdomain))
    })

    subdomain.addApiMapping(readGateway.deploymentStage, { basePath: "app" })
    subdomain.addApiMapping(writeGateway.deploymentStage, { basePath: "arduino" })

    // Deploy files to S3 bucket
    new BucketDeployment(this, "temperature-app-assets-deployment", {
      destinationBucket: assetsBucket,
      distribution,
      prune: true,
      sources: [Source.asset("../app/public")],
      cacheControl: [
        CacheControl.maxAge(Duration.days(365)),
        CacheControl.sMaxAge(Duration.days(365)),
      ],
    })

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