const formContainer = document.getElementById('jumbotron');

export default () => {
  const mainContainer = document.querySelector('body .container-fluid');
  const titlesRow = mainContainer.querySelector('.row.fixed-top');
  titlesRow.classList.remove('d-none');
  mainContainer.classList.remove('h-75');
  formContainer.parentNode.classList.remove('h-100');
  const { classList } = formContainer;
  classList.remove('w-100');
  classList.add('fixed-bottom', 'mb-0', 'mx-3');
};
