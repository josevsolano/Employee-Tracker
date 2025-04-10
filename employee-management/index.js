const inquirer = require("inquirer");
const chalk = require("chalk");
const { Pool } = require("pg");

// Connect to your PostgreSQL database
const pool = new Pool({
  user: "postgres", // <-- replace with PostgreSQL username
  host: "localhost",
  database: "employee_management", //replace with PostgreSQL database name
  password: "", //replace with PostgreSQL password
  port: 5432, // default PostgreSQL port
});

const mainMenu = async () => {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        "view all departments",
        "view all roles",
        "view all employees",
        "add a department",
        "add a role",
        "add an employee",
        "update an employee role",
        "exit"
      ]
    },
  ]);

  if (action === "view all departments") {
    await viewDepartments();
  } else if (action === "view all roles") {
    await viewRoles();
  } else if (action === "view all employees") {
    await viewEmployees();
  } else if (action === "add a department") {
    await addDepartment();
  } else if (action === "add a role") {
    await addRole();
  } else if (action === "add an employee") {
    await addEmployee();
  } else if (action === "update an employee role") {
    await updateEmployeeRole();
  } else if (action === "exit") {
    console.log(chalk.blue("Goodbye!"));
    process.exit();
  }

  // After finishing an action, go back to the main menu
  mainMenu();
};

// View departments
const viewDepartments = async () => {
  const res = await pool.query("SELECT * FROM department");
  console.table(res.rows);
};

// View roles
const viewRoles = async () => {
  const res = await pool.query(`
    SELECT role.id, role.title, department.name AS department, role.salary
    FROM role
    LEFT JOIN department ON role.department_id = department.id
  `);
  console.table(res.rows);
};

// View employees
const viewEmployees = async () => {
  const res = await pool.query(`
    SELECT employee.id, employee.first_name, employee.last_name, role.title, department.name AS department, role.salary,
      CONCAT(manager.first_name, ' ', manager.last_name) AS manager
    FROM employee
    LEFT JOIN role ON employee.role_id = role.id
    LEFT JOIN department ON role.department_id = department.id
    LEFT JOIN employee AS manager ON employee.manager_id = manager.id
  `);
  console.table(res.rows);
};

// Add department
const addDepartment = async () => {
  const { name } = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Enter the name of the new department:",
    },
  ]);

  await pool.query("INSERT INTO department (name) VALUES ($1)", [name]);
  console.log((`Added department: ${name}`));
};

// Add role
const addRole = async () => {
  const departments = await pool.query("SELECT * FROM department");
  const departmentChoices = departments.rows.map(({ id, name }) => ({
    name,
    value: id,
  }));

  const { title, salary, department_id } = await inquirer.prompt([
    {
      type: "input",
      name: "title",
      message: "Enter the role title:",
    },
    {
      type: "input",
      name: "salary",
      message: "Enter the salary for the role:",
      validate: (value) => (!isNaN(value) ? true : "Enter a valid number"),
    },
    {
      type: "list",
      name: "department_id",
      message: "Select the department:",
      choices: departmentChoices,
    },
  ]);

  await pool.query("INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3)", [title, salary, department_id]);
  console.log((`Added role: ${title}`));
};

// Add employee
const addEmployee = async () => {
  const roles = await pool.query("SELECT * FROM role");
  const roleChoices = roles.rows.map(({ id, title }) => ({
    name: title,
    value: id,
  }));

  const employees = await pool.query("SELECT * FROM employee");
  const managerChoices = employees.rows.map(({ id, first_name, last_name }) => ({
    name: `${first_name} ${last_name}`,
    value: id,
  }));
  managerChoices.unshift({ name: "None", value: null });

  const { first_name, last_name, role_id, manager_id } = await inquirer.prompt([
    {
      type: "input",
      name: "first_name",
      message: "Enter the employee's first name:",
    },
    {
      type: "input",
      name: "last_name",
      message: "Enter the employee's last name:",
    },
    {
      type: "list",
      name: "role_id",
      message: "Select the employee's role:",
      choices: roleChoices,
    },
    {
      type: "list",
      name: "manager_id",
      message: "Select the employee's manager:",
      choices: managerChoices,
    },
  ]);

  await pool.query(
    "INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)",
    [first_name, last_name, role_id, manager_id]
  );
  console.log((`Added employee: ${first_name} ${last_name}`));
};

// Update employee role
const updateEmployeeRole = async () => {
  const employees = await pool.query("SELECT * FROM employee");
  const employeeChoices = employees.rows.map(({ id, first_name, last_name }) => ({
    name: `${first_name} ${last_name}`,
    value: id,
  }));

  const roles = await pool.query("SELECT * FROM role");
  const roleChoices = roles.rows.map(({ id, title }) => ({
    name: title,
    value: id,
  }));

  const { employee_id, new_role_id } = await inquirer.prompt([
    {
      type: "list",
      name: "employee_id",
      message: "Select the employee to update:",
      choices: employeeChoices,
    },
    {
      type: "list",
      name: "new_role_id",
      message: "Select the new role:",
      choices: roleChoices,
    },
  ]);

  await pool.query("UPDATE employee SET role_id = $1 WHERE id = $2", [new_role_id, employee_id]);
  console.log((`Updated employee's role successfully!`));
};

// Start the app
mainMenu();
