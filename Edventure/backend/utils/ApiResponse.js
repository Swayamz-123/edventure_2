// Custom response class for standardizing API responses
class ApiResponse {
  constructor(statusCode, data, message = 'success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
export default ApiResponse;
