export default (response) => {
  const domParser = new DOMParser();
  const data = domParser.parseFromString(response.data, 'application/xml');
  const parserError = data.querySelector('parsererror');
  if (parserError) {
    throw new Error('Data format is wrong: \'application/xml\'-method can not parse it');
  }

  const descriptionBuffer = document.createElement('div');
  const getPureDescription = (description) => {
    descriptionBuffer.innerHTML = description;
    return descriptionBuffer.textContent;
  };
  const newsData = [...data.querySelectorAll('item')].map((item) => {
    const storyTitle = item.querySelector('title').textContent;
    const storyLink = item.querySelector('link').textContent;
    const storyDescription = item.querySelector('description').textContent;
    return [storyTitle, storyLink, getPureDescription(storyDescription)];
  });
  const feedTitle = data.querySelector('channel title').textContent;
  const feedDescription = data.querySelector('channel description').textContent;
  return { feedInfo: [feedTitle, feedDescription], newsData };
};
