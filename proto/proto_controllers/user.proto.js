import grpc from "@grpc/grpc-js";
import protoloader from "@grpc/proto-loader";

const packagedef = protoloader.loadSync("../proto/proto_services/user.proto", {
  keepCase: true,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
});
const grpcObject = grpc.loadPackageDefinition(packagedef);

export const userPackage = grpcObject.user;

export const user_protoclient = new userPackage.UserService(
  "localhost:50052",
  grpc.credentials.createInsecure()
);
