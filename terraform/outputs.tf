output "instance_id" {
  description = "The ID of the EC2 instance"
  value       = aws_instance.chess_server.id
}

output "public_ip" {
  description = "The public IPv4 address of the game server"
  value       = aws_instance.chess_server.public_ip
}

output "game_url" {
  description = "Direct web browser URL to play the live game"
  value       = "http://${aws_instance.chess_server.public_ip}"
}

output "ssh_command" {
  description = "Command to SSH into your server"
  value       = "ssh -i ~/.ssh/id_rsa_level3 ubuntu@${aws_instance.chess_server.public_ip}"
}
