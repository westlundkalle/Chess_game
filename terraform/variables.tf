variable "aws_region" {
  description = "The AWS Region to deploy infrastructure into"
  type        = string
  default     = "eu-north-1"
}

variable "instance_type" {
  description = "EC2 Instance Type (t3.micro is free-tier eligible in eu-north-1)"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Name of the EC2 Key Pair for SSH access"
  type        = string
  default     = "devops.school.level3.kalle-admin"
}

variable "repo_url" {
  description = "GitHub repository URL to clone on the server"
  type        = string
  default     = "https://github.com/westlundkalle/Chess_game.git"
}
