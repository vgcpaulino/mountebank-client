
docker-stop:
	@echo "Stopping all docker containers.."
	@docker compose down

docker-tests:
	@echo "Runing docker tests..."
	@docker compose up tests-unit tests-integration