export const updateView = () => {
  const mainContainer = document.querySelector('body .container-fluid');
  const titlesRow = mainContainer.querySelector('.row.fixed-top');
  const formContainer = document.getElementById('jumbotron');
  mainContainer.classList.remove('h-75');
  titlesRow.classList.remove('d-none');
  formContainer.parentNode.classList.remove('h-100');
  const { classList } = formContainer;
  classList.remove('w-100');
  classList.add('fixed-bottom', 'mb-0', 'mx-3');
};

export const makeFeedItem = (feedId, allFeedsInfo, feedsListTag) => {
  const { feedTitle, feedDescription, newsCount } = allFeedsInfo[feedId];
  const newFeedItem = document.createElement('div');
  feedsListTag.prepend(newFeedItem);
  newFeedItem.outerHTML = `<li class="list-group-item list-group-item-action rounded border mb-1 d-block" id="${feedId}">
    <div class="d-flex justify-content-center">
      <h5 class="flex-fill mb-1">${feedTitle}</h5>
      <div>
        <span id="${feedId}-badge" class="badge badge-success badge-pill mb-0">${newsCount}</span>
      </div>
    </div>
    <p class="flex-fill mb-1">${feedDescription}</p>
  </li>`;
};

export const makeNewsList = (newsData, newsTag) => {
  newsData.forEach((story, storyId) => {
    const [storyTitle, storyLink, storyDescription] = story;
    const descriptionBuffer = document.createElement('div');
    const getPureDescription = () => {
      descriptionBuffer.innerHTML = storyDescription;
      return descriptionBuffer.textContent;
    };
    const newStoryTag = document.createElement('div');
    newsTag.prepend(newStoryTag);
    newStoryTag.outerHTML = `<li class="list-group-item rounded border mb-1 d-block" id="${storyId}">
      <a href="${storyLink}">${storyTitle}</a>
      <button type="button" class="btn btn-outline-info btn-sm ml-3" data-toggle="modal" data-target="#modal-${storyId}">
        read more</button>
      <div class="modal fade bd-example-modal-lg" id="modal-${storyId}" role="dialog" tabindex="-1"
        aria-labelledby="modalCenterTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="#">${storyTitle}</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">${getPureDescription()}</div>
          </div>
        </div>
      </div>
    </li>`;
  });
};
