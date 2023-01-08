import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// create a vpc 
const myCustomVPC = new aws.ec2.Vpc("newVPC", {
    cidrBlock: "10.0.0.0/16",
    instanceTenancy: "default",
    tags: {
        Name: "newVPC",
    },
});

// Create one Public subnet in AZ A
const publicSubnetA = new aws.ec2.Subnet("publicSubnetA", {
    vpcId: myCustomVPC.id,
    availabilityZone : "ap-southeast-2a",
    cidrBlock: "10.0.1.0/24",
    tags: {
        Name: "publicSubnetA",
    },
});

// Create one Public subnet in AZ B
const privateSubnetB = new aws.ec2.Subnet("privateSubnetB", {
    vpcId: myCustomVPC.id,
    availabilityZone : "ap-southeast-2b",
    cidrBlock: "10.0.2.0/24",
    tags: {
        Name: "privateSubnetB",
    },
});

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.Bucket("my-bucket");

// Export the name of the bucket
export const bucketName = bucket.id;

export const vpcName = myCustomVPC.id;

export const publicSubnetAName = publicSubnetA.id;

export const privateSubnetBName = privateSubnetB.id;

