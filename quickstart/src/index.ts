import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// create a vpc 
const myCustomVPC = new aws.ec2.Vpc("newVPC", {
    cidrBlock: "10.0.0.0/16",
    enableDnsSupport: true,
    enableDnsHostnames: true,
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

// Create Internet Gateway for public subnet

const myInternetgw = new aws.ec2.InternetGateway("myInternetgw", {
    vpcId: myCustomVPC.id,
    tags: {
        Name: "myInternetgw",
    },
});


// Create EIP for NAT gateway

const myEIP = new aws.ec2.Eip("myEIP", {
    vpc: true,
}
, { dependsOn: [myInternetgw] });


// Create NAT Gateway
const myNATgateway = new aws.ec2.NatGateway("myNATgateway", {
    allocationId: myEIP.id,
    subnetId: publicSubnetA.id,
    tags: {
        Name: "myNATgateway",
    },
}, {
    dependsOn: [myInternetgw],
});

// Create Route Table for public subnet

const publicRouteTable = new aws.ec2.RouteTable("publicRouteTable", {
    vpcId: myCustomVPC.id,
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: myInternetgw.id,
        }
    ],
    tags: {
        Name: "publicRouteTable",
    },
});

// Create Route Table for private subnet

const privateRouteTable = new aws.ec2.RouteTable("privateRouteTable", {
    vpcId: myCustomVPC.id,
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: myNATgateway.id,
        }
    ],
    tags: {
        Name: "privateRouteTable",
    },
});


// Create Public Route Table association

const pub_route_association = new aws.ec2.RouteTableAssociation("pub_route_association", {
    subnetId: publicSubnetA.id,
    routeTableId: publicRouteTable.id,
});

// Create Private Route Table association

const private_route_association = new aws.ec2.RouteTableAssociation("private_route_association", {
    subnetId: privateSubnetB.id,
    routeTableId: privateRouteTable.id,
});

// Create a security group

const allowTlsSecurityGroup = new aws.ec2.SecurityGroup("allowTlsSecurityGroup", {
    description: "Allow TLS inbound traffic",
    vpcId: myCustomVPC.id,
    ingress: [{
        description: "TLS from public",
        fromPort: 443,
        toPort: 443,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"]
    }],
    egress: [{
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
        ipv6CidrBlocks: ["::/0"],
    }],
    tags: {
        Name: "allow_tls",
    },
});

// Create EC2 Role for SSM

const instanceAssumeRolePolicy = aws.iam.getPolicyDocument({
    statements: [{
        actions: ["sts:AssumeRole"],
        principals: [{
            type: "Service",
            identifiers: ["ec2.amazonaws.com"],
        }],
    }],
});

const EC2Role = new aws.iam.Role("EC2Role", {
    assumeRolePolicy: instanceAssumeRolePolicy.then(instanceAssumeRolePolicy => instanceAssumeRolePolicy.json),
    managedPolicyArns: ["arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforSSM"],
});

// Create Ec2 Instance Profile

const Ec2InstanceProfile = new aws.iam.InstanceProfile("Ec2InstanceProfile", {role: EC2Role.name});


// Create Ec2 Instance with SSM


// Get AMI
const awsLinuxAmi = aws.ec2.getAmi({
    owners: ["amazon"],
    filters: [{
        name: "name",
        values: ["amzn2-ami-hvm-*-x86_64-ebs"],
    }],
    mostRecent: true,
});

const myPulumiInstance = new aws.ec2.Instance("myPulumiInstance", {
    ami: awsLinuxAmi.then(awsLinuxAmi => awsLinuxAmi.id),
    instanceType: "t3.micro",
    iamInstanceProfile: Ec2InstanceProfile,
    subnetId: privateSubnetB.id,
    vpcSecurityGroupIds: [allowTlsSecurityGroup.id],
    creditSpecification: {
        cpuCredits: "unlimited",
    },
    tags: {
        Name: "myPulumiInstance",
    },
});


// Export the resources

export const vpcName = myCustomVPC.id;

export const publicSubnetAName = publicSubnetA.id;

export const privateSubnetBName = privateSubnetB.id;

export const myInternetgwId = myInternetgw.id;

export const myEIPAddress = myEIP.address;

export const myNATgatewayId = myNATgateway.id;

export const allowTlsSecurityGroupId = allowTlsSecurityGroup.id;

export const EC2RoleARN = EC2Role.arn;

export const Ec2InstanceProfileName = Ec2InstanceProfile.name;

export const myPulumiInstanceId = myPulumiInstance.id;

