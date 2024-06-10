import multiprocessing

workers = multiprocessing.cpu_count() * 2 + 1  # Adjust this formula as needed
worker_class = "uvicorn.workers.UvicornWorker"
bind = "0.0.0.0:8000"
