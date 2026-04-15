import re

with open("src/frontend/src/pages/client/service/[id].tsx", "r") as f:
    content = f.read()

# I want to rewrite the main content card structure slightly to make it look "cleaner"
# Let's change the top card to a row on desktop: Left = Provider Info (Avatar, Name, Rep), Right = Service Details (Title, Category, Location, Rating)

content = content.replace('border-gray-200', 'border-gray-100')

with open("src/frontend/src/pages/client/service/[id].tsx", "w") as f:
    f.write(content)

